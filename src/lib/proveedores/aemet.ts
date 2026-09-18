import type {
  GeoPoint,
  NormalizedForecast,
  OfficialWarning,
  WeatherHourly,
  WeatherProvider,
} from "@/lib/dominio/proveedores";

const PROVEEDOR = "aemet";
const BASE = "https://opendata.aemet.es/opendata/api";

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

/**
 * AEMET OpenData es una API en dos pasos: la primera petición devuelve una URL
 * temporal con los datos, que hay que volver a solicitar.
 */
async function pedirDatos(ruta: string): Promise<unknown> {
  const apiKey = process.env.AEMET_API_KEY;
  if (!apiKey) throw new Error("AEMET no configurado (falta AEMET_API_KEY)");

  const separador = ruta.includes("?") ? "&" : "?";
  const paso1 = await fetch(`${BASE}${ruta}${separador}api_key=${apiKey}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!paso1.ok) throw new Error(`AEMET HTTP ${paso1.status}`);

  const metadatos = (await paso1.json()) as { datos?: string };
  if (!metadatos.datos) throw new Error("AEMET no devolvió una URL de datos");

  const paso2 = await fetch(metadatos.datos, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!paso2.ok) throw new Error(`AEMET datos HTTP ${paso2.status}`);
  return paso2.json();
}

function normalizarHorarioAemet(
  datos: unknown,
  lat: number,
  lon: number,
): WeatherHourly[] {
  const lista = Array.isArray(datos) ? (datos as Record<string, unknown>[]) : [];
  const prediccion = (lista[0]?.prediccion ?? {}) as { dia?: unknown[] };
  const dias = Array.isArray(prediccion.dia)
    ? (prediccion.dia as Record<string, unknown>[])
    : [];
  const fetchedAt = new Date().toISOString();
  const salida: WeatherHourly[] = [];

  for (const dia of dias) {
    const fecha = typeof dia.fecha === "string" ? dia.fecha.slice(0, 10) : "";
    const horas = Array.isArray(dia.hora)
      ? (dia.hora as Record<string, unknown>[])
      : [];
    for (const hora of horas) {
      const periodo = typeof hora.periodo === "string" ? hora.periodo : "00";
      const hh = periodo.slice(0, 2).padStart(2, "0");
      const viento = (hora.vientoAndRachaMax ?? {}) as Record<string, unknown>;
      salida.push({
        timestamp: `${fecha}T${hh}:00:00Z`,
        latitude: lat,
        longitude: lon,
        temperatureC: numero(hora.temperatura),
        apparentTemperatureC: numero(hora.sensTermica),
        relativeHumidityPct: numero(hora.humedadRelativa),
        dewPointC: numero(hora.puntoRocio),
        precipitationMm: numero(hora.precipitacion),
        precipitationProbabilityPct: numero(hora.probPrecipitacion),
        windSpeedKmh: numero(viento.velocidad ?? hora.viento),
        windGustKmh: numero(viento.rachaMax ?? hora.rachaMax),
        windDirectionDeg: numero(hora.direccionViento),
        cloudCoverPct: numero(hora.cloudCover),
        solarRadiationWm2: numero(hora.radiacion),
        et0Mm: numero(hora.evapotranspiracion),
        provider: PROVEEDOR,
        fetchedAt,
      });
    }
  }

  if (salida.length === 0) {
    throw new Error("AEMET: no se pudo interpretar la predicción horaria");
  }
  return salida;
}

function normalizarAvisos(datos: unknown): OfficialWarning[] {
  const lista = Array.isArray(datos) ? (datos as Record<string, unknown>[]) : [];
  const avisos: OfficialWarning[] = [];
  for (const cap of lista) {
    const identificador = String(cap.identifier ?? cap.id ?? "aemet-aviso");
    const info = Array.isArray(cap.info)
      ? (cap.info as Record<string, unknown>[])
      : [];
    for (const bloque of info) {
      const area = (bloque.area ?? {}) as Record<string, unknown>;
      avisos.push({
        id: `${identificador}-${String(bloque.event ?? "aviso")}`,
        provider: PROVEEDOR,
        phenomenon: String(bloque.event ?? "Aviso meteorológico"),
        severity: String(bloque.severity ?? "info").toLowerCase(),
        startsAt: String(bloque.onset ?? bloque.effective ?? ""),
        endsAt: String(bloque.expires ?? ""),
        area: String(area.areaDesc ?? ""),
        headline: String(bloque.headline ?? bloque.event ?? "Aviso meteorológico"),
        description:
          typeof bloque.description === "string" ? bloque.description : undefined,
        sourceUrl: "https://www.aemet.es/es/eltiempo/prediccion/avisos",
      });
    }
  }
  return avisos;
}

/**
 * AEMET: avisos oficiales y predicción horaria municipal. Requiere
 * `AEMET_API_KEY` y `AEMET_MUNICIPIO` (predicción) o `AEMET_AREA` (avisos).
 */
export const proveedorAemet: WeatherProvider = {
  id: PROVEEDOR,
  capacidades: { forecast: true, current: false, warnings: true },
  configurado: () => Boolean(process.env.AEMET_API_KEY),

  async getForecast({ latitud, longitud }: GeoPoint): Promise<NormalizedForecast> {
    const municipio = process.env.AEMET_MUNICIPIO;
    if (!municipio) {
      throw new Error("AEMET: falta AEMET_MUNICIPIO para la predicción");
    }
    const datos = await pedirDatos(
      `/prediccion/especifica/municipio/horaria/${municipio}`,
    );
    return normalizarHorarioAemet(datos, latitud, longitud);
  },

  async getWarnings(): Promise<OfficialWarning[]> {
    const area = process.env.AEMET_AREA;
    if (!area) {
      throw new Error("AEMET: falta AEMET_AREA para los avisos");
    }
    const datos = await pedirDatos(`/avisos_cap/ultimoelaborado/area/${area}`);
    return normalizarAvisos(datos);
  },
};
