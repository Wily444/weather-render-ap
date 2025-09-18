// netlify/functions/getWeather.js
const axios = require('axios');

exports.handler = async function(event, context) {
  // --- 在这里填入你的 OpenWeatherMap API Key ---
  const OPENWEATHER_API_KEY = '3be32aaba43c81f3380a99bc5d393a4c'; // <--- 替换成你的 Key
  // ---------------------------------------------

  // OpenWeatherMap 使用城市名或经纬度查询，这里以北京为例
  const city = event.queryStringParameters.city || 'Beijing';

  // OpenWeatherMap API 的 URL (注意域名已经变了)
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn`;
  
  console.log("Requesting OpenWeatherMap URL:", url);

  try {
    const response = await axios.get(url);
    console.log("Successfully fetched data from OpenWeatherMap:", response.data);
    
    // 返回一个我们自己整理的、更简洁的数据结构给小程序
    const weatherData = {
      now: {
        temp: response.data.main.temp,
        feelsLike: response.data.main.feels_like,
        text: response.data.weather[0].description,
        windDir: response.data.wind.deg, // 风向角度
        windScale: response.data.wind.speed // 风速 (米/秒)
      },
      updateTime: new Date(response.data.dt * 1000).toISOString() // 转换时间戳
    };

    return {
      statusCode: 200,
      body: JSON.stringify(weatherData) // 返回整理后的数据
    };
  } catch (error) {
    console.error("An error occurred with OpenWeatherMap:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '获取天气数据失败', error_details: error.message })
    };
  }
};
