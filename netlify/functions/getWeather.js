const axios = require('axios');

exports.handler = async function(event, context) {
  const OPENWEATHER_API_KEY = '3be32aaba43c81f3380a99bc5d393a4c'; 

 const { lat, lon } = event.queryStringParameters;

  if (!lat || !lon) {
    return { statusCode: 400, body: JSON.stringify({ message: '缺少经纬度参数' }) };
  }
  // cnt=24 表示我们希望获取 24 * 3 = 72 小时（3天）的预报数据
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn&cnt=24`;
  
  console.log("Requesting Forecast API URL:", url);

  try {
    const response = await axios.get(url);
    
    // --- 对返回的原始数据进行预处理和聚合 ---
    const rawData = response.data;
    const forecastList = rawData.list;

    // 1. "当前天气"：我们直接取预报列表的第一项作为当前天气
    const currentWeather = {
      temp: forecastList[0].main.temp,
      feels_like: forecastList[0].main.feels_like,
      humidity: forecastList[0].main.humidity,
      weather: forecastList[0].weather,
      wind: forecastList[0].wind
    };

    // 2. "逐小时预报"：直接使用预报列表的前 8 项 (24小时)
    const hourlyForecast = forecastList.slice(0, 8);

    // 3. "未来几天预报"：我们需要自己写逻辑来聚合数据
    const dailyForecast = {};
    forecastList.forEach(item => {
      const date = item.dt_txt.split(' ')[0]; // 获取日期 'YYYY-MM-DD'
      if (!dailyForecast[date]) {
        dailyForecast[date] = {
          date: date,
          temps: [],
          weathers: {}
        };
      }
      dailyForecast[date].temps.push(item.main.temp);
      // 统计出现次数最多的天气状况作为当天天气
      const weatherDesc = item.weather[0].description;
      dailyForecast[date].weathers[weatherDesc] = (dailyForecast[date].weathers[weatherDesc] || 0) + 1;
    });

    const aggregatedDaily = Object.values(dailyForecast).map(day => {
      const maxTemp = Math.max(...day.temps);
      const minTemp = Math.min(...day.temps);
      const mainWeather = Object.keys(day.weathers).reduce((a, b) => day.weathers[a] > day.weathers[b] ? a : b);
      return { dt: new Date(day.date).getTime() / 1000, temp: { max: maxTemp, min: minTemp }, weather: [{ description: mainWeather }] };
    });

    // 4. 组合成最终返回给小程序的数据结构
    const processedData = {
      city: rawData.city,
      current: currentWeather,
      hourly: hourlyForecast,
      daily: aggregatedDaily
    };
    // --- 数据处理结束 ---
    
    return {
      statusCode: 200,
      body: JSON.stringify(processedData)
    };
  } catch (error) {
    console.error("An error occurred with Forecast API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '获取天气预报数据失败', error_details: error.message })
    };
  }
};
