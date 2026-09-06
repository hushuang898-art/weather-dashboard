// Weather Dashboard using Open-Meteo (no API key)

const form = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const unitsSelect = document.getElementById('unitsSelect');
const statusEl = document.getElementById('status');

const currentSection = document.getElementById('current');
const locationEl = document.getElementById('location');
const tempEl = document.getElementById('temperature');
const descEl = document.getElementById('description');
const windEl = document.getElementById('wind');
const timeEl = document.getElementById('time');
const coordsEl = document.getElementById('coords');
const iconEl = document.getElementById('weatherIcon');

const forecastSection = document.getElementById('forecast');
const forecastGrid = document.getElementById('forecastGrid');

let lastLat = null, lastLon = null, lastName = null, lastUnits = 'celsius';

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  lastUnits = unitsSelect.value;
  await searchCityAndShow(city, lastUnits);
});

unitsSelect.addEventListener('change', async () => {
  const units = unitsSelect.value;
  if (lastLat !== null && lastLon !== null) {
    lastUnits = units;
    await fetchAndRender(lastLat, lastLon, lastName, units);
  }
});

function showStatus(msg){
  statusEl.classList.remove('hidden');
  statusEl.textContent = msg;
}
function hideStatus(){ statusEl.classList.add('hidden'); statusEl.textContent = ''; }

async function searchCityAndShow(city, units){
  try{
    showStatus('Searching location…');
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`;
    const r = await fetch(geoUrl);
    if (!r.ok) throw new Error(`Geocoding failed: ${r.status}`);
    const data = await r.json();
    if (!data.results || data.results.length === 0) {
      showStatus('No location found. Try a different city name.');
      return;
    }
    const place = data.results[0];
    lastLat = place.latitude;
    lastLon = place.longitude;
    lastName = `${place.name}${place.admin1 ? ', ' + place.admin1 : ''}${place.country ? ', ' + place.country : ''}`;
    hideStatus();
    await fetchAndRender(lastLat, lastLon, lastName, units);
  }catch(err){
    console.error(err);
    showStatus('Error while searching location: ' + err.message);
  }
}

async function fetchAndRender(lat, lon, name, units){
  try{
    showStatus('Fetching weather…');
    const tempUnitParam = units === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    const windUnit = units === 'fahrenheit' ? 'mph' : 'kmh';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto` +
      `&temperature_unit=${tempUnitParam}&windspeed_unit=${windUnit}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API failed: ${res.status}`);
    const weather = await res.json();
    renderCurrent(weather, name, lat, lon, units);
    renderForecast(weather, units);
    hideStatus();
  }catch(err){
    console.error(err);
    showStatus('Error fetching weather: ' + err.message);
  }
}

function renderCurrent(weather, name, lat, lon, units){
  const cw = weather.current_weather;
  if (!cw) {
    showStatus('No current weather available for this location.');
    return;
  }
  currentSection.classList.remove('hidden');
  forecastSection.classList.remove('hidden');
  locationEl.textContent = name + (weather.timezone ? ` · ${weather.timezone}` : '');
  tempEl.textContent = `${Math.round(cw.temperature)}°${units === 'fahrenheit' ? 'F' : 'C'}`;
  descEl.textContent = mapWeatherCodeToDesc(cw.weathercode);
  windEl.textContent = `${cw.windspeed} ${weather.windspeed_unit || (units === 'fahrenheit' ? 'mph' : 'km/h')}`;
  timeEl.textContent = new Date(cw.time).toLocaleString();
  coordsEl.textContent = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  iconEl.textContent = mapWeatherCodeToEmoji(cw.weathercode);
}

function renderForecast(weather, units){
  const daily = weather.daily;
  if (!daily || !daily.time) {
    forecastGrid.innerHTML = '<div class="forecast-card">Forecast not available</div>';
    return;
  }
  forecastGrid.innerHTML = '';
  for (let i = 0; i < daily.time.length; i++){
    const dateStr = daily.time[i];
    const max = daily.temperature_2m_max[i];
    const min = daily.temperature_2m_min[i];
    const code = daily.weathercode[i];
    const date = new Date(dateStr);
    const dayLabel = date.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="day">${dayLabel}</div>
      <div class="icon">${mapWeatherCodeToEmoji(code)}</div>
      <div class="temps"><span class="max">${Math.round(max)}°</span> / <span class="min">${Math.round(min)}°</span></div>
      <div class="desc small">${mapWeatherCodeToDesc(code)}</div>
    `;
    forecastGrid.appendChild(card);
  }
}

function mapWeatherCodeToEmoji(code){
  if (code === 0) return '☀️';
  if ([1,2,3].includes(code)) return '⛅';
  if ([45,48].includes(code)) return '🌫️';
  if ([51,53,55,56,57].includes(code)) return '🌦️';
  if ([61,63,65,66,67].includes(code)) return '🌧️';
  if ([71,73,75,77].includes(code)) return '🌨️';
  if ([80,81,82].includes(code)) return '🌧️';
  if ([85,86].includes(code)) return '❄️';
  if ([95,96,99].includes(code)) return '⛈️';
  return '❔';
}
function mapWeatherCodeToDesc(code){
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45,48].includes(code)) return 'Fog';
  if ([51,53,55].includes(code)) return 'Drizzle';
  if ([56,57].includes(code)) return 'Freezing drizzle';
  if ([61,63,65].includes(code)) return 'Rain';
  if ([66,67].includes(code)) return 'Freezing rain';
  if ([71,73,75].includes(code)) return 'Snow';
  if (code === 77) return 'Snow grains';
  if ([80,81,82].includes(code)) return 'Rain showers';
  if ([85,86].includes(code)) return 'Snow showers';
  if ([95].includes(code)) return 'Thunderstorm';
  if ([96,99].includes(code)) return 'Thunderstorm with hail';
  return 'Unknown';
}

(async function tryGeolocation(){
  try{
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      lastLat = pos.coords.latitude;
      lastLon = pos.coords.longitude;
      lastName = 'Your location';
      lastUnits = unitsSelect.value;
      await fetchAndRender(lastLat,lastLon,lastName,lastUnits);
    }, () => {}, {timeout:5000});
  }catch(e){}
})();
