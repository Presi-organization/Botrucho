const OPEN_METEO_URI = 'https://api.open-meteo.com/v1/forecast';
const MEDELLIN = { latitude: 6.2442, longitude: -75.5812 };

export interface CurrentWeather {
  temperature: number;
  code: number;
  isDay: boolean;
}

interface ForecastResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number };
}

export const getCurrentWeather = async (): Promise<CurrentWeather> => {
  const params = new URLSearchParams({
    latitude: `${MEDELLIN.latitude}`,
    longitude: `${MEDELLIN.longitude}`,
    current: 'temperature_2m,weather_code,is_day',
    timezone: 'America/Bogota',
  });
  const response: Response = await fetch(`${OPEN_METEO_URI}?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  const { current } = (await response.json()) as ForecastResponse;
  return {
    temperature: current.temperature_2m,
    code: current.weather_code,
    isDay: !!current.is_day,
  };
};

// WMO weather interpretation codes: https://open-meteo.com/en/docs
export const describeWeather = (code: number, isDay: boolean): string => {
  if (code === 0) return isDay ? '☀️ despejado' : '🌙 despejado';
  if (code <= 2) return isDay ? '🌤️ algo nublado' : '☁️ algo nublado';
  if (code === 3) return '☁️ nublado';
  if (code <= 48) return '🌫️ con niebla';
  if (code <= 57) return '🌦️ lloviznando';
  if (code <= 67 || (code >= 80 && code <= 82)) return '🌧️ lloviendo';
  if (code >= 95) return '⛈️ con tormenta';
  return '☁️ nublado';
};
