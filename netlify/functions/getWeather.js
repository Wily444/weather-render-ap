// netlify/functions/getWeather.js

const axios = require('axios');

exports.handler = async function(event, context) {
  // --- 在这里填入你的和风天气 API Key ---
  const HEFENG_API_KEY = '4ed6e1878bcb4b2a91d27544d2f7120b'; 
  // -----------------------------------------

   const { location = '101010100' } = event.queryStringParameters;
  const url = `https://devapi.qweather.com/v7/weather/now?location=${location}&key=${HEFENG_API_KEY}`;
  
  // 增加日志：打印将要请求的 URL
  console.log("Requesting URL:", url);

  try {
    const response = await axios.get(url);
    
    // 增加日志：打印成功获取的数据
    console.log("Successfully fetched data:", response.data);
    
    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    //打印详细的错误对象
    console.error("An error occurred:", error);
    
    // 返回更详细的错误信息给前端，方便调试
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: '获取天气数据失败',
        // 将 axios 的错误信息也包含进去
        error_details: error.message, 
        // 如果是 axios 的网络错误，还会有 config 和 code 等信息
        axios_error_code: error.code 
      })
    };
  }
};
