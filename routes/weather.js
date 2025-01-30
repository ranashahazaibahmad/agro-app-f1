const express = require('express');
const axios = require('axios');
const router = express.Router();

// Replace this with your actual WeatherAPI key
const apiKey = '5febfcf245a34d5c93022448231610';

// Define the weather route
router.get('/:city', async (req, res) => {
  const city = req.params.city;

  try {
    // Fetch weather data from WeatherAPI
    const response = await axios.get(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=no`);
    const weatherData = response.data;
    // console.log(weatherData);
    

    // Structure the response
    const weatherInfo = {
      city: weatherData.location.name,
      country: weatherData.location.country,
      temperature_celsius: weatherData.current.temp_c,
      temperature_fahrenheit: weatherData.current.temp_f,
      condition: weatherData.current.condition.text,
      wind_kph: weatherData.current.wind_kph,
      humidity: weatherData.current.humidity
    };

    res.json(weatherInfo);
  } catch (error) {
    // Handle errors (e.g., if city is not found)
    res.status(500).json({ message: 'Error fetching weather data', error: error.message });
  }
});

module.exports = router;
