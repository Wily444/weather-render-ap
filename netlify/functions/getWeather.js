// netlify/functions/getWeather.js
const axios = require('axios');

exports.handler = async function(event, context) {
  const API_HOST = 'p52tunm8wb.re.qweatherapi.com'; // 替换成您能用的 apihost
  const HEFENG_API_KEY = 'ef83c03ab480444187e74628aa4282ba';

  const params = event.queryStringParameters || {};
  const { lat, lon } = params;

  if (!lat || !lon) {
    return { statusCode: 400, body: JSON.stringify({ message: '请求中缺少经纬度参数' }) };
  }

  const location = `${lon},${lat}`;
  const forecastUrl = `https://${API_HOST}/v7/weather/7d?location=${location}&key=${HEFENG_API_KEY}`;
  const warningUrl = `https://${API_HOST}/v7/warning/now?location=${location}&key=${HEFENG_API_KEY}`;

  //
  // --- 这是最关键的修正：伪造一个浏览器 User-Agent 请求头 ---
  //
  const requestOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    }
  };

  try {
    console.log("并行请求和风天气API (使用伪造请求头)...");
    
    // 在请求时，传入我们伪造的请求头
    const [forecastRes, warningRes] = await Promise.all([
      axios.get(forecastUrl, requestOptions),
      axios.get(warningUrl, requestOptions)
    ]);
    
    if (forecastRes.data.code !== '200' || warningRes.data.code !== '200') {
      console.error("和风天气API返回业务错误:", { forecast: forecastRes.data, warning: warningRes.data });
      throw new Error(`和风天气API业务错误: ${forecastRes.data.code}, ${warningRes.data.code}`);
    }
    
    console.log("成功获取所有数据。");

    const finalData = {
      daily: forecastRes.data.daily,
      warning: warningRes.data.warning,
      updateTime: forecastRes.data.updateTime
    };

    return {
      statusCode: 200,
      body: JSON.stringify(finalData)
    };

  } catch (error) {
    console.error("请求和风天气API时发生异常:", error);
    // 返回更详细的错误给小程序端，方便调试
    return {
      statusCode: 500,
      body: JSON.stringify({ 
          message: '获取天气数据失败', 
          error_details: error.response ? error.response.data : error.message 
      })
    };
  }
};
