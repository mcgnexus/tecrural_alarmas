import type { WeatherHourly } from "@/lib/dominio/proveedores";
import { PROVEEDOR_OPEN_METEO } from "@/lib/fuentes/open-meteo";

interface RespHourly {
  time?: string[];
  temperature_2m?: (number | null)[];
  apparent_temperature?: (number | null)[];
  relative_humidity_2m?: (number | null)[];
  dew_point_2m?: (number | null)[];
  precipitation?: (number | null)[];
  precipitation_probability?: (number | null)[];
  wind_speed_10m?: (number | null)[];
  wind_gusts_10m?: (number | null)[];
  wind_direction_10m?: (number | null)[];
  cloud_cover?: (number | null)[];
  shortwave_radiation?: (number | null)[];
  et0_fao_evapotranspiration?: (number | null)[];
}

interface RespOpenMeteo {
  latitude?: number;
  longitude?: number;
  hourly?: RespHourly;
}

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function isoUtc(valor: unknown): string {
  if (typeof valor === "string" && valor.length > 0) {
    return valor.endsWith("Z") ? valor : `${valor}Z`;
  }
  return new Date().toISOString();
}

/**
 * Capa 3 (normalización): payload crudo de Open-Meteo -> `WeatherHourly[]`.
 * Formato interno canónico, independiente del proveedor.
 */
export function normalizarHorario(
  respuesta: unknown,
  lat: number,
  lon: number,
): WeatherHourly[] {
  const datos = respuesta as RespOpenMeteo;
  const horario = datos.hourly;
  const tiempos = horario?.time ?? [];
  const fetchedAt = new Date().toISOString();

  return tiempos.map((t, i) => ({
    timestamp: isoUtc(t),
    latitude: lat,
    longitude: lon,

    temperatureC: numero(horario?.temperature_2m?.[i]),
    apparentTemperatureC: numero(horario?.apparent_temperature?.[i]),

    relativeHumidityPct: numero(horario?.relative_humidity_2m?.[i]),
    dewPointC: numero(horario?.dew_point_2m?.[i]),

    precipitationMm: numero(horario?.precipitation?.[i]),
    precipitationProbabilityPct: numero(
      horario?.precipitation_probability?.[i],
    ),

    windSpeedKmh: numero(horario?.wind_speed_10m?.[i]),
    windGustKmh: numero(horario?.wind_gusts_10m?.[i]),
    windDirectionDeg: numero(horario?.wind_direction_10m?.[i]),

    cloudCoverPct: numero(horario?.cloud_cover?.[i]),
    solarRadiationWm2: numero(horario?.shortwave_radiation?.[i]),

    et0Mm: numero(horario?.et0_fao_evapotranspiration?.[i]),

    provider: PROVEEDOR_OPEN_METEO,
    fetchedAt,
  }));
}
