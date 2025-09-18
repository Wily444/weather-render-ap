// netlify/functions/getWeather.js

const axios = require('axios');

exports.handler = async function(event, context) {
  // --- 在这里填入你的和风天气 API Key ---
  const HEFENG_API_KEY = '4ed6e1878bcb4b2a91d27544d2f7120b'; 
  // -----------------------------------------

  const { location = '101010100' } = event.queryStringParameters;
  const url = `https://devapi.qweather.com/v7/weather/now?location=${location}&key=${HEFENG_API_KEY}`;
  
  try {
    const response = await axios.get(url);
    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '获取天气数据失败' })
    };
  }
};