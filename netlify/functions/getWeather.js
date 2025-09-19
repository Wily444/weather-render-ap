// netlify/functions/getWeather.js
const axios = require('axios');

exports.handler = async function(event, context) {
  const OPENWEATHER_API_KEY = '3be32aaba43c81f3380a99bc5d393a4c';
  const API_HOST = 'p52tunm8wb.re.qweatherapi.com';
  const HEFENG_API_KEY = 'ef83c03ab480444187e74628aa4282ba';

 // ------------------------------------

  const params = event.queryStringParameters || {};
  const { lat, lon } = params;
  if (!lat || !lon) {
    return { statusCode: 400, body: JSON.stringify({ message: '缺少经纬度参数' }) };
  }

  // --- 准备三个 API 的请求地址 ---
  // 1. OpenWeatherMap 的 /forecast API (作为基础数据)
  const openWeatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn&cnt=24`;
  // 2. 和风天气的地理位置查询 API (用于获取城市名)
  const geoUrl = `https://${HEFENG_API_HOST}/v7/geo/lookup?location=${lon},${lat}&key=${HEFENG_API_KEY}`;
  // 3. 和风天气的灾害预警 API
  const warningUrl = `https://${HEFENG_API_HOST}/v7/warning/now?location=${lon},${lat}&key=${HEFENG_API_KEY}`;

  const requestOptions = {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' }
  };

  try {
    console.log("并行请求 OpenWeatherMap 和和风天气 API...");
    const [openWeatherRes, geoRes, warningRes] = await Promise.all([
      axios.get(openWeatherUrl), // OpenWeatherMap 不需要伪造 User-Agent
      axios.get(geoUrl, requestOptions),
      axios.get(warningUrl, requestOptions)
    ]);

    // 检查所有请求是否都业务成功
    if (openWeatherRes.data.cod !== '200' || geoRes.data.code !== '200' || warningRes.data.code !== '200') {
      console.error("API 业务错误:", { owm: openWeatherRes.data, geo: geoRes.data, warn: warningRes.data });
      throw new Error('API业务错误');
    }
    console.log("成功获取所有平台的原始数据。");

    // --- 核心步骤：智能合并数据 ---
    const owmData = openWeatherRes.data;
    
    const finalData = {
      // 城市名：来自和风天气，更准确
      city: geoRes.data.location[0].name, 

      // 当前天气：来自 OpenWeatherMap 列表的第一项
      current: {
        temp: owmData.list[0].main.temp,
        feels_like: owmData.list[0].main.feels_like,
        humidity: owmData.list[0].main.humidity,
        weather: owmData.list[0].weather
      },

      // 逐小时预报：来自 OpenWeatherMap
      hourly: owmData.list.slice(0, 8),

      // 未来几天预报：来自 OpenWeatherMap (需要自己聚合)
      daily: aggregateDailyForecast(owmData.list),

      // 天气预警：来自和风天气
      warning: warningRes.data.warning
    };
    // --- 合并结束 ---

    return { statusCode: 200, body: JSON.stringify(finalData) };

  } catch (error) {
    console.error("请求API时发生异常:", error.response ? error.response.data : error.message);
    return { statusCode: 500, body: JSON.stringify({ message: '获取天气数据失败' }) };
  }
};

// 辅助函数：用于聚合 OpenWeatherMap 的 3 小时数据为每日数据
function aggregateDailyForecast(forecastList) {
  const dailyData = {};
  forecastList.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    if (!dailyData[date]) {
      dailyData[date] = {
        dt: item.dt,
        temps: [],
        weathers: {}
      };
    }
    dailyData[date].temps.push(item.main.temp);
    const weatherIcon = item.weather[0].icon.substring(0, 2); // 只取数字部分，忽略 d/n
    dailyData[date].weathers[weatherIcon] = (dailyData[date].weathers[weatherIcon] || 0) + 1;
  });

  return Object.values(dailyData).map(day => {
    const mainIcon = Object.keys(day.weathers).reduce((a, b) => day.weathers[a] > day.weathers[b] ? a : b);
    return {
      dt: day.dt,
      temp: {
        max: Math.max(...day.temps),
        min: Math.min(...day.temps)
      },
      // 我们需要自己根据 icon 推断 description
      weather: [{ icon: `${mainIcon}d`, description: '多云转晴' }] // 这是一个简化的示例
    };
  });
}
