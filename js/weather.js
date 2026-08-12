/**
 * Wetter über Open-Meteo — ohne API-Schlüssel und mit CORS-Freigabe, läuft
 * also direkt von GitHub Pages aus. Antworten werden 30 Minuten
 * zwischengespeichert, damit die Ansicht offline etwas anzeigen kann.
 */

const CACHE_KEY = 'ap.weather.v1';
const MAX_AGE = 30 * 60 * 1000;

const CODES = {
  0: ['Klar', 'sun'],
  1: ['Überwiegend klar', 'sun'],
  2: ['Teils bewölkt', 'cloud'],
  3: ['Bedeckt', 'cloud'],
  45: ['Nebel', 'cloud'],
  48: ['Reifnebel', 'cloud'],
  51: ['Leichter Nieselregen', 'cloud'],
  53: ['Nieselregen', 'cloud'],
  55: ['Starker Nieselregen', 'cloud'],
  56: ['Gefrierender Niesel', 'cloud'],
  57: ['Gefrierender Niesel', 'cloud'],
  61: ['Leichter Regen', 'cloud'],
  63: ['Regen', 'cloud'],
  65: ['Starker Regen', 'cloud'],
  66: ['Gefrierender Regen', 'cloud'],
  67: ['Gefrierender Regen', 'cloud'],
  71: ['Leichter Schneefall', 'cloud'],
  73: ['Schneefall', 'cloud'],
  75: ['Starker Schneefall', 'cloud'],
  77: ['Schneegriesel', 'cloud'],
  80: ['Leichte Schauer', 'cloud'],
  81: ['Schauer', 'cloud'],
  82: ['Kräftige Schauer', 'cloud'],
  85: ['Schneeschauer', 'cloud'],
  86: ['Schneeschauer', 'cloud'],
  95: ['Gewitter', 'cloud'],
  96: ['Gewitter mit Hagel', 'cloud'],
  99: ['Gewitter mit Hagel', 'cloud'],
};

export function describe(code) {
  return CODES[code] || ['—', 'cloud'];
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && Date.now() - parsed.at < MAX_AGE ? parsed : { ...parsed, stale: true };
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch { /* Cache ist optional */ }
}

/** Ortssuche nach Name. */
export async function searchPlace(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=de&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Ortssuche fehlgeschlagen');
  const json = await res.json();
  return (json.results || []).map((r) => ({
    name: r.name,
    admin: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/** Aktuelles Wetter plus Vorhersage für die nächsten Tage. */
export async function fetchWeather(lat, lon, { allowCache = true } = {}) {
  const cached = readCache();
  if (allowCache && cached && !cached.stale
    && Math.abs(cached.data.lat - lat) < 0.05 && Math.abs(cached.data.lon - lon) < 0.05) {
    return cached.data;
  }

  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`
    + '&current=temperature_2m,weather_code,apparent_temperature'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&timezone=auto&forecast_days=6';

  const res = await fetch(url);
  if (!res.ok) throw new Error('Wetterdienst nicht erreichbar');
  const json = await res.json();

  const data = {
    lat,
    lon,
    now: {
      temp: Math.round(json.current.temperature_2m),
      feels: Math.round(json.current.apparent_temperature),
      code: json.current.weather_code,
    },
    days: (json.daily?.time || []).map((date, i) => ({
      date,
      code: json.daily.weather_code[i],
      max: Math.round(json.daily.temperature_2m_max[i]),
      min: Math.round(json.daily.temperature_2m_min[i]),
      rain: json.daily.precipitation_probability_max?.[i] ?? null,
    })),
  };

  writeCache(data);
  return data;
}

/** Zuletzt geladene Daten — auch wenn sie älter als 30 Minuten sind. */
export function cachedWeather() {
  const c = readCache();
  return c ? c.data : null;
}

export function locate() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Standort wird von diesem Browser nicht unterstützt'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.code === 1 ? 'Standortzugriff wurde abgelehnt' : 'Standort nicht verfügbar')),
      { timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  });
}
