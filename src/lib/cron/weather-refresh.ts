import { isNotNull } from "drizzle-orm";
import { obtenerClimaPunto, obtenerAvisosOficiales } from "@/lib/clima/motor";
import { obtenerDb } from "@/lib/datos/db";
import { parcelasPlataforma, ubicacionesClima } from "@/lib/datos/plataforma-schema";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("cron.weather-refresh");

export interface WeatherRefreshResult {
  locations: number;
  refreshed: number;
  warningsRefreshed: number;
  errors: number;
}

/**
 * Cada hora:
 * 1. obtener weather_locations activas;
 * 2. actualizar forecast;
 * 3. actualizar avisos oficiales;
 * 4. cachear resultados (weather_hourly + official_alerts via motor).
 */
export async function ejecutarWeatherRefresh(): Promise<WeatherRefreshResult> {
  const db = obtenerDb();

  // Activas = ubicaciones con al menos una parcela que usa esa rejilla,
  // fallback a todas las ubicaciones si no hay parcelas.
  const parcelas = await db
    .select({ latitude: parcelasPlataforma.latitude, longitude: parcelasPlataforma.longitude })
    .from(parcelasPlataforma)
    .where(isNotNull(parcelasPlataforma.latitude));

  const unicos = new Map<string, { lat: number; lon: number }>();
  for (const p of parcelas) {
    if (p.latitude === null || p.longitude === null) continue;
    const key = `${p.latitude.toFixed(2)}:${p.longitude.toFixed(2)}`;
    if (!unicos.has(key)) unicos.set(key, { lat: p.latitude, lon: p.longitude });
  }

  // Si no hay parcelas, refrescar todas las ubicaciones registradas
  if (unicos.size === 0) {
    const todas = await db.select({ latitude: ubicacionesClima.latitude, longitude: ubicacionesClima.longitude }).from(ubicacionesClima);
    for (const u of todas) {
      const key = `${u.latitude.toFixed(2)}:${u.longitude.toFixed(2)}`;
      if (!unicos.has(key)) unicos.set(key, { lat: u.latitude, lon: u.longitude });
    }
  }

  let refreshed = 0;
  let warningsRefreshed = 0;
  let errors = 0;

  for (const { lat, lon } of unicos.values()) {
    try {
      // 2. forecast + 4. cache (obtenerClimaPunto persiste en weather_hourly)
      await obtenerClimaPunto(lat, lon);
      refreshed += 1;
    } catch (e) {
      errors += 1;
      log.warn("cron.weather.forecast.error", { external_source: "open-meteo" }, e);
    }

    try {
      // 3. avisos oficiales + 4. cache (obtenerAvisosOficiales persiste)
      const avisos = await obtenerAvisosOficiales(lat, lon);
      warningsRefreshed += avisos.length;
    } catch (e) {
      log.warn("cron.weather.warnings.error", { external_source: "aemet" }, e);
    }
  }

  log.info("cron.weather-refresh.ok", { data: { locations: unicos.size, refreshed, warningsRefreshed, errors } });
  return { locations: unicos.size, refreshed, warningsRefreshed, errors };
}
