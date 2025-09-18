const axios = require('axios');

exports.handler = async function(event, context) {
  const OPENWEATHER_API_KEY = '3be32aaba43c81f3380a99bc5d393a4c'; 

   // 从请求参数中获取经纬度
 const { lat, lon } = event.queryStringParameters;

  if (!lat || !lon) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: '缺少经纬度参数 (lat and lon)' })
    };
  }

  //
  // --- 关键改动：使用 One Call API 3.0 ---
  //
  // exclude=minutely,alerts 可以排除掉暂时用不到的分钟级预报和天气警报，减少数据量
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn`;
  
  console.log("Requesting One Call API URL:", url);

  try {
    const response = await axios.get(url);
    console.log("Successfully fetched detailed data.");
    
    // 直接将获取到的所有详细数据返回给小程序
    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error("An error occurred with One Call API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '获取详细天气数据失败', error_details: error.message })
    };
  }
};
