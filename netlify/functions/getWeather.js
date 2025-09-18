// netlify/functions/getWeather.js
const axios = require('axios');

exports.handler = async function(event, context) {
  // --- 在这里填入你的 OpenWeatherMap API Key ---
  const OPENWEATHER_API_KEY = '3be32aaba43c81f3380a99bc5d393a4c'; // <--- 替换成你的 Key
  // ---------------------------------------------

   // 1. 从请求参数中获取经纬度
  const { lat, lon } = event.queryStringParameters;

  // 2. 检查经纬度是否存在。如果不存在，则返回错误或默认值
  if (!lat || !lon) {
    return {
      statusCode: 400, // Bad Request 错误
      body: JSON.stringify({ message: '缺少经纬度参数 (lat and lon)' })
    };
  }

  // 3. 使用经纬度构造 OpenWeatherMap API 的 URL
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn`;
  
  console.log("Requesting OpenWeatherMap URL with coordinates:", url);

  try {
    const response = await axios.get(url);
    console.log("Successfully fetched data:", response.data);
    
    // 整理数据，增加城市名
    const weatherData = {
      city: response.data.name, // 从返回数据中获取城市名
      now: {
        temp: response.data.main.temp,
        feelsLike: response.data.main.feels_like,
        text: response.data.weather[0].description,
        windDir: response.data.wind.deg,
        windScale: response.data.wind.speed
      },
      updateTime: new Date(response.data.dt * 1000).toISOString()
    };

    return {
      statusCode: 200,
      body: JSON.stringify(weatherData)
    };
  } catch (error) {
    console.error("An error occurred:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '获取天气数据失败', error_details: error.message })
    };
  }
};
