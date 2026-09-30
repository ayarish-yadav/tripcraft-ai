import {resolveDestination,publicJSON} from './cityResearch.js';
export async function getWeather(destination){
  const p=await resolveDestination(destination);
  return publicJSON(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&daily=temperature_2m_max,precipitation_probability_max&timezone=auto&forecast_days=7`);
}
