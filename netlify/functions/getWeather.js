// netlify/functions/getWeather.js
const axios = require('axios');

exports.handler = async function(event, context) {
  const OPENWEATHER_API_KEY = '3be32aaba43c81f3380a99bc5d393a4c';
  const HEFENG_API_HOST = 'p52tunm8wb.re.qweatherapi.com';
  const HEFENG_API_KEY = 'ef83c03ab480444187e74628aa4282ba';

  // ---------------------------------------------

  const params = event.queryStringParameters || {};
  const { lat, lon } = params;

  if (!lat || !lon) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ message: '请求中缺少经纬度参数 (lat and lon)' }) 
    };
  }

  // --- 准备两个服务商的 API 地址 ---
  // 1. OpenWeatherMap (主数据源)
  const openWeatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn&cnt=24`;

  // 2. 和风天气 (补充数据源)
  const hefengLocation = `${lon},${lat}`;
  const hefengWarningUrl = `https://${HEFENG_API_HOST}/v7/warning/now?location=${hefengLocation}&key=${HEFENG_API_KEY}`;
  const hefengGeoUrl = `https://${HEFENG_API_HOST}/v2/city/lookup?location=${hefengLocation}&key=${HEFENG_API_KEY}`; // 用于反查城市名

  const hefengRequestOptions = {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' }
  };

  try {
    console.log("并行请求 OpenWeatherMap 和 和风天气...");
    const [owRes, hfWarningRes, hfGeoRes] = await Promise.all([
      axios.get(openWeatherUrl),
      axios.get(hefengWarningUrl, hefengRequestOptions),
      axios.get(hefengGeoUrl, hefengRequestOptions)
    ]);

    // --- 核心步骤：智能合并数据 ---
    // 1. 以 OpenWeatherMap 的数据为基础
    const rawOwData = owRes.data;
    
    // 2. 提取和风天气的数据 (如果请求成功)
    const warnings = hfWarningRes.data.code === '200' ? hfWarningRes.data.warning : [];
    const cityInfo = hfGeoRes.data.code === '200' ? hfGeoRes.data.location[0] : null;

    // 3. 开始“翻译”和“组装”
    // "当前天气" (从 OpenWeatherMap 的第一条预报模拟)
    const current = {
      temp: rawOwData.list[0].main.temp,
      feels_like: rawOwData.list[0].main.feels_like,
      humidity: rawOwData.list[0].main.humidity,
      weather: rawOwData.list[0].weather,
      wind: rawOwData.list[0].wind
    };

    // "逐小时预报" (从 OpenWeatherMap 的预报列表提取)
    const hourly = rawOwData.list.slice(0, 8);

    // "未来几天预报" (从 OpenWeatherMap 的预报列表聚合)
    const dailyForecast = {};
    rawOwData.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyForecast[date]) {
            dailyForecast[date] = { date, temps: [], weathers: {}, icons: {} };
        }
        dailyForecast[date].temps.push(item.main.temp);
        const weatherDesc = item.weather[0].description;
        const weatherIcon = item.weather[0].icon;
        dailyForecast[date].weathers[weatherDesc] = (dailyForecast[date].weathers[weatherDesc] || 0) + 1;
        dailyForecast[date].icons[weatherIcon] = (dailyForecast[date].icons[weatherIcon] || 0) + 1;
    });

    const daily = Object.values(dailyForecast).map(day => ({
        dt: new Date(day.date).getTime() / 1000,
        temp: { max: Math.max(...day.temps), min: Math.min(...day.temps) },
        weather: [{ description: Object.keys(day.weathers).reduce((a, b) => day.weathers[a] > day.weathers[b] ? a : b) }],
        icon: Object.keys(day.icons).reduce((a, b) => day.icons[a] > day.icons[b] ? a : b)
    }));

    // 4. 组合成最终的完美数据
    const finalData = {
      city: cityInfo ? `${cityInfo.adm2} ${cityInfo.name}` : rawOwData.city.name, // 优先用和风的中文城市名
      current: current,
      hourly: hourly,
      daily: daily,
      warning: warnings // 加入天气预警
    };

    return { 
      statusCode: 200, 
      body: JSON.stringify(finalData) 
    };

  } catch (error) {
    console.error("请求混合API时发生异常:", error.response ? error.response.data : error.message);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: '获取天气数据失败' }) 
    };
  }
};
