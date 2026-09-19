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
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string" && valor.trim() !== "") {
    const n = Number(valor.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** AEMET describe la dirección del viento con letras (N, NE, SO, O…). */
const GRADOS_DIRECCION: Record<string, number> = {
  N: 0,
  NNE: 22,
  NE: 45,
  ENE: 67,
  E: 90,
  ESE: 112,
  SE: 135,
  SSE: 157,
  S: 180,
  SSO: 202,
  SO: 225,
  OSO: 247,
  O: 270,
  ONO: 292,
  NO: 315,
  NNO: 337,
};

function gradosDeDireccion(valor: unknown): number | null {
  const d = Array.isArray(valor) ? valor[0] : valor;
  if (typeof d !== "string") return null;
  return GRADOS_DIRECCION[d.trim().toUpperCase()] ?? null;
}

/**
 * AEMET usa periodos horarios ("15") o rangos ("1420" = de 14 a 20,
 * "2002" = de 20 a 02). Devuelve las horas locales cubiertas.
 */
function horasDePeriodo(periodo: unknown): number[] {
  const p = typeof periodo === "string" ? periodo : String(periodo ?? "");
  if (!/^\d{1,4}$/.test(p)) return [];
  if (p.length <= 2) {
    const h = Number(p);
    return h >= 0 && h <= 23 ? [h] : [];
  }
  const ini = Number(p.slice(0, 2));
  const fin = Number(p.slice(2, 4));
  if (ini > 23 || fin > 23) return [];
  const horas: number[] = [];
  let h = ini;
  for (let i = 0; i < 24; i++) {
    horas.push(h);
    if (h === fin) break;
    h = (h + 1) % 24;
  }
  return horas;
}

function mapaPorHora(
  entradas: unknown,
  extraer: (entrada: Record<string, unknown>) => number | null,
): Map<number, number> {
  const mapa = new Map<number, number>();
  const lista = Array.isArray(entradas)
    ? (entradas as Record<string, unknown>[])
    : [];
  for (const entrada of lista) {
    const valor = extraer(entrada);
    if (valor === null) continue;
    for (const hora of horasDePeriodo(entrada.periodo)) {
      mapa.set(hora, valor);
    }
  }
  return mapa;
}

function offsetMadridMinutos(instante: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const partes = Object.fromEntries(
    dtf.formatToParts(instante).map((p) => [p.type, p.value]),
  );
  const comoUtc = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour) % 24,
    Number(partes.minute),
    Number(partes.second),
  );
  return (comoUtc - instante.getTime()) / 60000;
}

/** Hora local de Madrid (fecha + hora) al instante UTC en formato ISO. */
function aUtcMadrid(fecha: string, hora: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  const aproximado = Date.UTC(y, m - 1, d, hora, 0, 0);
  const offset = offsetMadridMinutos(new Date(aproximado));
  return new Date(aproximado - offset * 60000).toISOString();
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
    if (!fecha) continue;

    const temperatura = mapaPorHora(dia.temperatura, (e) => numero(e.value));
    const sensacion = mapaPorHora(dia.sensTermica, (e) => numero(e.value));
    const humedad = mapaPorHora(dia.humedadRelativa, (e) => numero(e.value));
    const rocio = mapaPorHora(dia.puntoRocio, (e) => numero(e.value));
    const precipitacion = mapaPorHora(dia.precipitacion, (e) => numero(e.value));
    const probPrecipitacion = mapaPorHora(
      dia.probPrecipitacion,
      (e) => numero(e.value),
    );
    const viento = mapaPorHora(dia.vientoAndRachaMax, (e) =>
      numero(Array.isArray(e.velocidad) ? e.velocidad[0] : e.velocidad),
    );
    const direccion = mapaPorHora(dia.vientoAndRachaMax, (e) =>
      gradosDeDireccion(e.direccion),
    );
    const racha = mapaPorHora(dia.vientoAndRachaMax, (e) => numero(e.value));

    for (let hora = 0; hora < 24; hora++) {
      const tieneDatos =
        temperatura.has(hora) ||
        humedad.has(hora) ||
        precipitacion.has(hora) ||
        viento.has(hora);
      if (!tieneDatos) continue;

      salida.push({
        timestamp: aUtcMadrid(fecha, hora),
        latitude: lat,
        longitude: lon,
        temperatureC: temperatura.get(hora) ?? null,
        apparentTemperatureC: sensacion.get(hora) ?? null,
        relativeHumidityPct: humedad.get(hora) ?? null,
        dewPointC: rocio.get(hora) ?? null,
        precipitationMm: precipitacion.get(hora) ?? null,
        precipitationProbabilityPct: probPrecipitacion.get(hora) ?? null,
        windSpeedKmh: viento.get(hora) ?? null,
        windGustKmh: racha.get(hora) ?? null,
        windDirectionDeg: direccion.get(hora) ?? null,
        cloudCoverPct: null,
        solarRadiationWm2: null,
        et0Mm: null,
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
