const apiKey = "VRshJedfxSIjwmQwmHFIOwUQuZyggDHs";

// Weather icons based on Tomorrow.io weather codes
function getWeatherIcon(code) {
  const map = {
    1000: "☀️", // Clear
    1001: "☁️", // Cloudy
    1101: "🌤", // Mostly clear
    1102: "⛅", // Partly cloudy
    2000: "🌫", // Fog
    4000: "🌧", // Rain
    4200: "🌦", // Light rain
    6000: "❄️", // Snow
    8000: "⛈", // Thunderstorm
  };
  return map[code] || "❓";
}

// Get weather based on user's location
async function getWeatherByLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const cityName = await getCityNameFromCoords(lat, lon);
    const weatherData = await fetchTomorrowForecast(lat, lon);
    displayForecast(weatherData, `Your Location – ${cityName}`);
  }, () => {
    alert("Unable to retrieve your location");
  });
}

// Get coordinates by city name
async function getCoordinates(city) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}`;
  const res = await fetch(geoUrl);
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("City not found");
  }
  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

// Fetch forecast data from Tomorrow.io
async function fetchTomorrowForecast(lat, lon) {
  const url = `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&timesteps=1d&apikey=${apiKey}&fields=temperatureMin,temperatureMax,temperatureApparentMin,temperatureApparentMax,humidityAvg,windSpeedAvg,precipitationProbabilityAvg,weatherCodeMax`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

// Display the forecast in the UI
function displayForecast(data, cityLabel) {
  document.getElementById("weatherResult").classList.remove("hidden");
  const title = document.getElementById("cityName");
  title.textContent = cityLabel;
  title.classList.remove("fade-in");
  void title.offsetWidth;
  title.classList.add("fade-in");

  const daily = data.timelines.daily;
  const forecast = document.getElementById("forecast");
  forecast.innerHTML = "";

  daily.forEach((day, index) => {
    const date = day.time.split("T")[0];
    const icon = getWeatherIcon(day.values.weatherCodeMax);
    const tempMin = day.values.temperatureMin;
    const tempMax = day.values.temperatureMax;

    const card = document.createElement("div");
    card.className = "weather-card fade-in";
    card.innerHTML = `
      <p class="date">${date}</p>
      <p class="icon text-2xl">${icon}</p>
      <p>${tempMin}° / ${tempMax}°</p>
    `;

    card.onclick = () => {
      const feelsMin = day.values.temperatureApparentMin;
      const feelsMax = day.values.temperatureApparentMax;
      const humidity = day.values.humidityAvg;
      const wind = day.values.windSpeedAvg;
      const rain = day.values.precipitationProbabilityAvg;

      document.getElementById("modalBody").innerHTML = `
        <h3>${date}</h3>
        <p>${icon}</p>
        <p><strong>Temp:</strong> ${tempMin}° / ${tempMax}°</p>
        <p><strong>Feels like:</strong> ${feelsMin}° / ${feelsMax}°</p>
        <p><strong>Humidity:</strong> ${humidity}%</p>
        <p><strong>Wind:</strong> ${wind} km/h</p>
        <p><strong>Rain chance:</strong> ${rain}%</p>
      `;
      document.getElementById("weatherModal").classList.remove("hidden");
    };

    forecast.appendChild(card);
  });
}

// Suggest cities while typing
async function suggestCities() {
  const input = document.getElementById('cityInput');
  const query = input.value.trim();
  const suggestionList = document.getElementById('suggestionList');

  suggestionList.innerHTML = '';
  suggestionList.classList.add('hidden');

  if (query.length < 2) return;

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) return;

    data.results.forEach(city => {
      const li = document.createElement('li');
      li.className = "p-2 hover:bg-blue-100 cursor-pointer";
      li.textContent = `${city.name}, ${city.country}`;
      li.onclick = () => {
        document.getElementById('cityInput').value = city.name;
        document.getElementById('suggestionList').classList.add('hidden');
        searchWeather();
      };
      suggestionList.appendChild(li);
    });

    suggestionList.classList.remove("dropdown-animate");
    void suggestionList.offsetWidth;
    suggestionList.classList.add("dropdown-animate");
    suggestionList.classList.remove('hidden');
  } catch (err) {
    console.error("City suggestion error:", err);
  }
}

// Search weather by city name
async function searchWeather() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return alert("Enter city name");

  try {
    const { latitude, longitude, name, country } = await getCoordinates(city);
    const weatherData = await fetchTomorrowForecast(latitude, longitude);
    displayForecast(weatherData, `${name}, ${country}`);
    addRecentSearch(city);
  } catch (error) {
    console.error(error);
    alert("Error fetching weather data");
  }
}

// Add city to recent searches
function addRecentSearch(city) {
  let searches = JSON.parse(localStorage.getItem('recentSearches')) || [];
  if (!searches.includes(city)) {
    searches.unshift(city);
    if (searches.length > 5) searches.pop();
    localStorage.setItem('recentSearches', JSON.stringify(searches));
  }
  updateDropdown();
}

// Update recent search dropdown
function updateDropdown() {
  let searches = JSON.parse(localStorage.getItem('recentSearches')) || [];
  const dropdown = document.getElementById('recentSearches');
  dropdown.innerHTML = '<option value="">Select recent city</option>';
  searches.forEach(city => {
    dropdown.innerHTML += `<option value="${city}">${city}</option>`;
  });
}

// Handle selecting a recent city
async function handleRecentSearch(select) {
  if (select.value) {
    document.getElementById('cityInput').value = select.value;
    await searchWeather();
  }
}

// Reverse geocode to get city name from lat/lon
async function getCityNameFromCoords(lat, lon) {
  const apiKey = "858df98b9c1648839624011426f7a3ac";
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.results.length > 0) {
      const components = data.results[0].components;
      const city = components.city || components.town || components.village || components.state_district || components.county;
      const country = components.country;
      return `${city}, ${country}`;
    }
    return "Unknown Location";
  } catch (err) {
    console.error("Reverse geocoding failed:", err);
    return "Unknown Location";
  }
}

// Modal close actions
document.getElementById("modalClose").onclick = () => {
  document.getElementById("weatherModal").classList.add("hidden");
};

window.onclick = (e) => {
  if (e.target === document.getElementById("weatherModal")) {
    document.getElementById("weatherModal").classList.add("hidden");
  }
};

// Hide suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!document.getElementById("cityInput").contains(e.target)) {
    document.getElementById("suggestionList").classList.add("hidden");
  }
});

// Load recent dropdown on start
updateDropdown();
