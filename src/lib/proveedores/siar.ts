import type {
  NormalizedForecast,
  NormalizedObservation,
  WeatherHourly,
  WeatherProvider,
} from "@/lib/dominio/proveedores";

const PROVEEDOR = "siar";

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

/**
 * SiAR: ET0, radiación y datos agroclimáticos de estaciones. No ofrece
 * predicción, solo observación agroclimática.
 */
export const proveedorSiar: WeatherProvider = {
  id: PROVEEDOR,
  capacidades: { forecast: false, current: true, warnings: false },
  configurado: () =>
    Boolean(process.env.SIAR_BASE_URL && process.env.SIAR_ESTACION),

  async getForecast(): Promise<NormalizedForecast> {
    throw new Error("SiAR no ofrece predicción (solo datos agroclimáticos)");
  },

  async getCurrent(): Promise<NormalizedObservation> {
    const base = process.env.SIAR_BASE_URL;
    const estacion = process.env.SIAR_ESTACION;
    const token = process.env.SIAR_TOKEN ?? process.env.SIAR_API_KEY ?? process.env.SIAR_API_TOKEN ?? "";
    if (!base || !estacion) {
      throw new Error("SiAR no configurado (SIAR_BASE_URL/SIAR_ESTACION)");
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (token) {
      headers["authorization"] = `Bearer ${token}`;
      headers["x-api-key"] = token;
      headers["x-siar-token"] = token;
    }

    const respuesta = await fetch(
      `${base.replace(/\/$/, "")}/estaciones/${encodeURIComponent(estacion)}`,
      {
        headers,
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!respuesta.ok) throw new Error(`SiAR HTTP ${respuesta.status}`);

    const datos = (await respuesta.json()) as Record<string, unknown>;
    const observadaEn = new Date().toISOString();
    const hora: WeatherHourly = {
      timestamp: observadaEn,
      latitude: 0,
      longitude: 0,
      temperatureC: numero(datos.temperatura),
      apparentTemperatureC: null,
      relativeHumidityPct: numero(datos.humedad),
      dewPointC: null,
      precipitationMm: numero(datos.precipitacion),
      precipitationProbabilityPct: null,
      windSpeedKmh: numero(datos.viento),
      windGustKmh: numero(datos.racha),
      windDirectionDeg: numero(datos.direccionViento),
      cloudCoverPct: null,
      solarRadiationWm2: numero(datos.radiacion),
      et0Mm: numero(datos.et0 ?? datos.eto),
      provider: PROVEEDOR,
      fetchedAt: observadaEn,
    };
    return hora;
  },
};
