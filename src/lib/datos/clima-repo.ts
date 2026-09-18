import { and, desc, eq, gt, sql } from "drizzle-orm";
import { obtenerDb } from "./db";
import { climaHorario, ubicacionesClima } from "./plataforma-schema";
import { claveGrid, redondearGrid } from "@/lib/dominio/coordenadas";
import type { WeatherHourly } from "@/lib/dominio/proveedores";

export interface UbicacionClima {
  id: string;
  gridKey: string;
}

/** Resuelve (o crea) el punto meteorológico reutilizable para una rejilla 0.02°. */
export async function obtenerOCrearUbicacion(
  lat: number,
  lon: number,
): Promise<UbicacionClima> {
  const db = obtenerDb();
  const gridKey = claveGrid(lat, lon);

  const [existente] = await db
    .select({ id: ubicacionesClima.id })
    .from(ubicacionesClima)
    .where(eq(ubicacionesClima.gridKey, gridKey))
    .limit(1);
  if (existente) return { id: existente.id, gridKey };

  const [creada] = await db
    .insert(ubicacionesClima)
    .values({
      latitude: redondearGrid(lat),
      longitude: redondearGrid(lon),
      gridKey,
    })
    .onConflictDoNothing({ target: ubicacionesClima.gridKey })
    .returning({ id: ubicacionesClima.id });
  if (creada) return { id: creada.id, gridKey };

  const [otra] = await db
    .select({ id: ubicacionesClima.id })
    .from(ubicacionesClima)
    .where(eq(ubicacionesClima.gridKey, gridKey))
    .limit(1);
  if (!otra) throw new Error("No se pudo resolver la ubicación meteorológica.");
  return { id: otra.id, gridKey };
}

function aHourly(
  fila: typeof climaHorario.$inferSelect,
  lat: number,
  lon: number,
): WeatherHourly {
  return {
    timestamp: fila.timestamp.toISOString(),
    latitude: lat,
    longitude: lon,
    temperatureC: fila.temperatureC,
    apparentTemperatureC: fila.apparentTemperatureC,
    relativeHumidityPct: fila.relativeHumidityPct,
    dewPointC: fila.dewPointC,
    precipitationMm: fila.precipitationMm,
    precipitationProbabilityPct: fila.precipitationProbabilityPct,
    windSpeedKmh: fila.windSpeedKmh,
    windGustKmh: fila.windGustKmh,
    windDirectionDeg: fila.windDirectionDeg,
    cloudCoverPct: fila.cloudCoverPct,
    solarRadiationWm2: fila.solarRadiationWm2,
    et0Mm: fila.et0Mm,
    provider: fila.provider,
    fetchedAt: fila.fetchedAt.toISOString(),
  };
}

/** Guarda/actualiza la serie horaria de una ubicación (una fila por hora). */
export async function guardarHorario(
  locationId: string,
  horas: WeatherHourly[],
): Promise<void> {
  if (horas.length === 0) return;
  const db = obtenerDb();
  const valores = horas.map((hora) => ({
    weatherLocationId: locationId,
    provider: hora.provider,
    timestamp: new Date(hora.timestamp),
    temperatureC: hora.temperatureC,
    apparentTemperatureC: hora.apparentTemperatureC,
    relativeHumidityPct: hora.relativeHumidityPct,
    dewPointC: hora.dewPointC,
    precipitationMm: hora.precipitationMm,
    precipitationProbabilityPct: hora.precipitationProbabilityPct,
    windSpeedKmh: hora.windSpeedKmh,
    windGustKmh: hora.windGustKmh,
    windDirectionDeg: hora.windDirectionDeg,
    cloudCoverPct: hora.cloudCoverPct,
    solarRadiationWm2: hora.solarRadiationWm2,
    et0Mm: hora.et0Mm,
    fetchedAt: new Date(hora.fetchedAt),
  }));

  await db
    .insert(climaHorario)
    .values(valores)
    .onConflictDoUpdate({
      target: [
        climaHorario.weatherLocationId,
        climaHorario.provider,
        climaHorario.timestamp,
      ],
      set: {
        temperatureC: sql`excluded.temperature_c`,
        apparentTemperatureC: sql`excluded.apparent_temperature_c`,
        relativeHumidityPct: sql`excluded.relative_humidity_pct`,
        dewPointC: sql`excluded.dew_point_c`,
        precipitationMm: sql`excluded.precipitation_mm`,
        precipitationProbabilityPct: sql`excluded.precipitation_probability_pct`,
        windSpeedKmh: sql`excluded.wind_speed_kmh`,
        windGustKmh: sql`excluded.wind_gust_kmh`,
        windDirectionDeg: sql`excluded.wind_direction_deg`,
        cloudCoverPct: sql`excluded.cloud_cover_pct`,
        solarRadiationWm2: sql`excluded.solar_radiation_wm2`,
        et0Mm: sql`excluded.et0_mm`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    });
}

/**
 * Serie horaria más reciente de una ubicación (misma tanda de `fetched_at`),
 * siempre que se haya descargado después de `desde`.
 */
export async function leerHorarioReciente(
  locationId: string,
  desde: Date,
): Promise<WeatherHourly[]> {
  const db = obtenerDb();
  const filas = await db
    .select({
      fila: climaHorario,
      lat: ubicacionesClima.latitude,
      lon: ubicacionesClima.longitude,
    })
    .from(climaHorario)
    .innerJoin(
      ubicacionesClima,
      eq(climaHorario.weatherLocationId, ubicacionesClima.id),
    )
    .where(
      and(
        eq(climaHorario.weatherLocationId, locationId),
        gt(climaHorario.fetchedAt, desde),
      ),
    )
    .orderBy(desc(climaHorario.fetchedAt));

  if (filas.length === 0) return [];

  const ultimaTanda = filas[0]!.fila.fetchedAt.getTime();
  return filas
    .filter((f) => f.fila.fetchedAt.getTime() === ultimaTanda)
    .map((f) => aHourly(f.fila, f.lat, f.lon))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
