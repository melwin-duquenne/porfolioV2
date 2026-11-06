// Météo réelle via Open-Meteo (open-meteo.com) : gratuit, sans clé ni cookie,
// interrogé directement par le navigateur du visiteur (rien ne passe par le site).

const TIMEOUT_MS = 5000

// Code météo WMO courant aux coordonnées données, ou null si indisponible
// (hors ligne, service en panne, réponse inattendue, trop lent). Ne lève jamais.
export async function fetchWeatherCode(lat, lon, fetchFn = fetch) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return null
    const code = (await res.json())?.current?.weather_code
    return typeof code === 'number' ? code : null
  } catch (e) {
    return null
  }
}
