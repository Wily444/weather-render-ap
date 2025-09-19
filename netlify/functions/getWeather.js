// netlify/functions/getWeather.js
const axios = require('axios');

exports.handler = async function(event, context) {
  // --- 在这里填入你的和风天气 API Key ---
  const HEFENG_API_KEY = '4ed6e1878bcb4b2a91d27544d2f7120b'; // <--- 替换成你自己的和风天气 Key
  // -----------------------------------------

  const { lat, lon } = event.queryStringParameters;
  if (!lat || !lon) {
    return { statusCode: 400, body: JSON.stringify({ message: '缺少经纬度参数' }) };
  }

  // 将经纬度格式化成和风天气需要的 'lon,lat' 格式
  const location = `${lon},${lat}`;

  // --- 准备两个 API 的请求地址 ---
  // 1. 获取未来7天天气预报的 API
  const forecastUrl = `https://devapi.qweather.com/v7/weather/7d?location=${location}&key=${HEFENG_API_KEY}`;
  // 2. 获取天气灾害预警的 API
  const warningUrl = `https://devapi.qweather.com/v7/warning/now?location=${location}&key=${HEFENG_API_KEY}`;

  try {
    // --- 使用 Promise.all 并行发起两个请求，提升效率 ---
    console.log("并行请求和风天气API...");
    const [forecastRes, warningRes] = await Promise.all([
      axios.get(forecastUrl),
      axios.get(warningUrl)
    ]);
    
    // --- 检查两个请求是否都成功 ---
    if (forecastRes.data.code !== '200' || warningRes.data.code !== '200') {
      console.error("和风天气API返回错误:", { forecast: forecastRes.data, warning: warningRes.data });
      throw new Error('和风天气API业务错误');
    }
    
    console.log("成功获取所有数据。");

    // --- 组合最终返回给小程序的数据 ---
    const finalData = {
      daily: forecastRes.data.daily,       // 未来7天预报
      warning: warningRes.data.warning,    // 天气预警 (可能是一个空数组)
      updateTime: forecastRes.data.updateTime // 更新时间
    };

    return {
      statusCode: 200,
      body: JSON.stringify(finalData)
    };

  } catch (error) {
    console.error("请求和风天气API时发生异常:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '获取天气数据失败', error_details: error.message })
    };
  }
};
