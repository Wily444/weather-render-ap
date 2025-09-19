// netlify/functions/getWeather.js
const axios = require('axios');

exports.handler = async function(event, context) {
  const API_HOST = 'p52tunm8wb.re.qweatherapi.com';
  const HEFENG_API_KEY = 'ef83c03ab480444187e74628aa4282ba';

  const params = event.queryStringParameters || {};
  const { lat, lon } = params;

  if (!lat || !lon) {
    return { statusCode: 400, body: JSON.stringify({ message: '缺少经纬度参数' }) };
  }

  const location = `${lon},${lat}`;
  const requestOptions = {
    headers: { 'User-Agent': 'Mozilla/5.0 ...' } // 保持 User-Agent
  };

  // --- 准备三个 API 的请求地址 ---
  const dailyUrl = `https://${API_HOST}/v7/weather/7d?location=${location}&key=${HEFENG_API_KEY}`;
  const hourlyUrl = `https://${API_HOST}/v7/weather/24h?location=${location}&key=${HEFENG_API_KEY}`; // 新增
  const warningUrl = `https://${API_HOST}/v7/warning/now?location=${location}&key=${HEFENG_API_KEY}`;

  try {
    console.log("并行请求和风天气API (7d, 24h, warning)...");
    const [dailyRes, hourlyRes, warningRes] = await Promise.all([
      axios.get(dailyUrl, requestOptions),
      axios.get(hourlyUrl, requestOptions), // 新增
      axios.get(warningUrl, requestOptions)
    ]);
    
    // 检查所有请求是否都成功
    if (dailyRes.data.code !== '200' || hourlyRes.data.code !== '200' || warningRes.data.code !== '200') {
      throw new Error('和风天气API业务错误');
    }
    
    console.log("成功获取所有数据。");

    // --- 组合最终返回给小程序的数据 ---
    const finalData = {
      daily: dailyRes.data.daily,
      hourly: hourlyRes.data.hourly, // 新增
      warning: warningRes.data.warning,
      updateTime: dailyRes.data.updateTime
    };

    return { statusCode: 200, body: JSON.stringify(finalData) };

  } catch (error) {
    console.error("请求和风天气API时发生异常:", error.response ? error.response.data : error.message);
    return { statusCode: 500, body: JSON.stringify({ message: '获取天气数据失败' }) };
  }
};
