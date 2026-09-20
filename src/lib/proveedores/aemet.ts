import { gunzipSync } from "node:zlib";
import type {
  GeoPoint,
  NormalizedForecast,
  OfficialWarning,
  WeatherHourly,
  WeatherProvider,
} from "@/lib/dominio/proveedores";

const PROVEEDOR = "aemet";
const BASE = "https://opendata.aemet.es/opendata/api";

// Respaldo para parcelas guardadas o búsquedas procedentes de la base de datos.
// Las coordenadas del catálogo son centros municipales y se comparan con una
// tolerancia amplia para no depender de un único AEMET_MUNICIPIO global.
const MUNICIPIOS_GRANADA: Array<[number, number, string]> = [
  [37.8106, -2.5412, "18098"], [37.4897, -2.7735, "18023"],
  [37.9587, -2.4354, "18164"], [37.7969, -2.9415, "18046"],
  [37.6425, -2.4788, "18145"], [37.6833, -2.55, "18077"],
  [37.5833, -2.4744, "18057"], [36.7352, -3.6916, "18017"],
  [36.6206, -3.7348, "18017"], [36.7447, -3.5849, "18173"],
  [36.7448, -3.3426, "18140"],
];

function municipioAemetPorCoordenadas(lat: number, lon: number): string | undefined {
  let mejor: string | undefined;
  let distancia = Number.POSITIVE_INFINITY;
  for (const [mLat, mLon, codigo] of MUNICIPIOS_GRANADA) {
    const d = (lat - mLat) ** 2 + (lon - mLon) ** 2;
    if (d < distancia) { distancia = d; mejor = codigo; }
  }
  return distancia <= 0.04 ** 2 ? mejor : undefined;
}

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
 * temporal con los datos, que hay que volver a solicitar. La key gratuita
 * limita peticiones por minuto: revalidamos 1 h y reintentamos ante 429.
 */
const REVALIDACION_AEMET_S = 3600;
const RETRASO_REINTENTO_MS = 2500;

async function fetchConReintento429(
  url: string,
  signal: AbortSignal,
  revalidateS: number = REVALIDACION_AEMET_S,
): Promise<Response> {
  const opciones = { signal, next: { revalidate: revalidateS } as const };
  let respuesta = await fetch(url, opciones);
  if (respuesta.status === 429) {
    await new Promise((resolver) => setTimeout(resolver, RETRASO_REINTENTO_MS));
    respuesta = await fetch(url, opciones);
  }
  return respuesta;
}

/**
 * AEMET OpenData es una API en dos pasos: la primera petición devuelve una URL
 * temporal con los datos, que hay que volver a solicitar.
 */
async function pedirDatos(ruta: string): Promise<unknown> {
  const apiKey = process.env.AEMET_API_KEY;
  if (!apiKey) throw new Error("AEMET no configurado (falta AEMET_API_KEY)");

  const separador = ruta.includes("?") ? "&" : "?";
  const paso1 = await fetchConReintento429(
    `${BASE}${ruta}${separador}api_key=${apiKey}`,
    AbortSignal.timeout(15_000),
  );
  if (!paso1.ok) throw new Error(`AEMET HTTP ${paso1.status}`);

  const metadatos = (await paso1.json()) as { datos?: string };
  if (!metadatos.datos) throw new Error("AEMET no devolvió una URL de datos");

  const paso2 = await fetchConReintento429(
    metadatos.datos,
    AbortSignal.timeout(10_000),
  );
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
 * AEMET publica los avisos CAP como un archivo tar (content-type
 * `application/x-gtar`) con XML por zona, no como JSON. Se descarga el tar,
 * se extraen los XML y se parsean los campos CAP.
 */
function parsearTar(buf: Buffer): { nombre: string; contenido: Buffer }[] {
  const archivos: { nombre: string; contenido: Buffer }[] = [];
  let offset = 0;
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512);
    const nombre = header
      .subarray(0, 100)
      .toString("latin1")
      .replace(/\0.*$/, "")
      .trim();
    if (!nombre) break; // bloque final de ceros
    const sizeOctal = header
      .subarray(124, 136)
      .toString("latin1")
      .replace(/\0.*$/, "")
      .trim();
    const size = Number.parseInt(sizeOctal, 8) || 0;
    const inicio = offset + 512;
    archivos.push({ nombre, contenido: buf.subarray(inicio, inicio + size) });
    offset = inicio + Math.ceil(size / 512) * 512;
  }
  return archivos;
}

function desescaparXml(texto: string): string {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, codigo) => String.fromCharCode(Number(codigo)))
    .replace(/&amp;/g, "&")
    .trim();
}

function extraerEtiqueta(xml: string, etiqueta: string): string | null {
  const coincidencia = xml.match(
    new RegExp(`<${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)</${etiqueta}>`, "i"),
  );
  return coincidencia ? desescaparXml(coincidencia[1]) : null;
}

/** Parsea un XML CAP (una o varias alertas) a `OfficialWarning[]`. */
export function parsearCapXml(xml: string): OfficialWarning[] {
  const avisos: OfficialWarning[] = [];
  const alertas = xml.match(/<alert(?:\s[^>]*)?>[\s\S]*?<\/alert>/gi) ?? [];
  for (const alerta of alertas) {
    const identificador = extraerEtiqueta(alerta, "identifier") ?? "aemet-aviso";
    const bloques = alerta.match(/<info(?:\s[^>]*)?>[\s\S]*?<\/info>/gi) ?? [];
    for (const bloque of bloques) {
      const event = extraerEtiqueta(bloque, "event") ?? "Aviso meteorológico";
      const areaBloque =
        bloque.match(/<area(?:\s[^>]*)?>[\s\S]*?<\/area>/i)?.[0] ?? "";
      const area = extraerEtiqueta(areaBloque, "areaDesc") ?? "";
      avisos.push({
        id: `${identificador}-${event}`,
        provider: PROVEEDOR,
        phenomenon: event,
        severity: (extraerEtiqueta(bloque, "severity") ?? "info").toLowerCase(),
        startsAt: extraerEtiqueta(bloque, "onset") ?? extraerEtiqueta(bloque, "effective") ?? "",
        endsAt: extraerEtiqueta(bloque, "expires") ?? "",
        area,
        headline: extraerEtiqueta(bloque, "headline") ?? event,
        description: extraerEtiqueta(bloque, "description") ?? undefined,
        sourceUrl: "https://www.aemet.es/es/eltiempo/prediccion/avisos",
      });
    }
  }
  return avisos;
}

function normalizarAvisosTar(buf: Buffer): OfficialWarning[] {
  const xmls = parsearTar(buf)
    .filter((archivo) => /\.xml$/i.test(archivo.nombre))
    .map((archivo) => archivo.contenido.toString("latin1"));
  const vistos = new Set<string>();
  const avisos: OfficialWarning[] = [];
  for (const xml of xmls) {
    for (const aviso of parsearCapXml(xml)) {
      if (vistos.has(aviso.id)) continue;
      vistos.add(aviso.id);
      avisos.push(aviso);
    }
  }
  return avisos;
}

/** AEMET CAP usa códigos numéricos de área; `AND-*` es de otra API. */
const AREA_CAP_POR_COMUNIDAD: Record<string, string> = {
  AND: "61",
  ARA: "20",
  AST: "33",
  BAL: "07",
  CAN: "35",
  CNT: "39",
  CLM: "30",
  CYL: "36",
  CAT: "62",
  EXT: "52",
  GAL: "53",
  MAD: "28",
  MUR: "63",
  NAV: "31",
  PVA: "65",
  RIO: "26",
  VAL: "67",
  CEU: "51",
  MEL: "64",
};

function resolverAreaCap(): string {
  const explicito = process.env.AEMET_CAP_AREA?.trim();
  if (explicito) return explicito;
  const area = process.env.AEMET_AREA?.trim().toUpperCase() ?? "";
  const comunidad = area.split("-")[0] ?? "";
  return AREA_CAP_POR_COMUNIDAD[comunidad] ?? area ?? "61";
}

async function pedirAvisosCap(
  ruta: string,
): Promise<{ json: unknown | null; tar: Buffer | null }> {
  const apiKey = process.env.AEMET_API_KEY;
  if (!apiKey) throw new Error("AEMET no configurado (falta AEMET_API_KEY)");

  const separador = ruta.includes("?") ? "&" : "?";
  const paso1 = await fetchConReintento429(
    `${BASE}${ruta}${separador}api_key=${apiKey}`,
    AbortSignal.timeout(10_000),
    900,
  );
  if (!paso1.ok) throw new Error(`AEMET HTTP ${paso1.status}`);

  const metadatos = (await paso1.json()) as { datos?: string; estado?: number };
  if (!metadatos.datos) return { json: null, tar: null }; // sin avisos activos

  const paso2 = await fetchConReintento429(
    metadatos.datos,
    AbortSignal.timeout(15_000),
    900,
  );
  if (!paso2.ok) throw new Error(`AEMET datos HTTP ${paso2.status}`);

  const tipo = paso2.headers.get("content-type") ?? "";
  if (tipo.includes("json")) {
    return { json: await paso2.json(), tar: null };
  }
  const bruto = Buffer.from(await paso2.arrayBuffer());
  const descomprimido =
    bruto[0] === 0x1f && bruto[1] === 0x8b ? gunzipSync(bruto) : bruto;
  return { json: null, tar: descomprimido };
}

/**
 * AEMET: avisos oficiales y predicción horaria municipal. Requiere
 * `AEMET_API_KEY` y `AEMET_MUNICIPIO` (predicción) o `AEMET_AREA` (avisos).
 */
export const proveedorAemet: WeatherProvider = {
  id: PROVEEDOR,
  capacidades: { forecast: true, current: false, warnings: true },
  configurado: () => Boolean(process.env.AEMET_API_KEY),

  async getForecast({ latitud, longitud, aemetMunicipio }: GeoPoint): Promise<NormalizedForecast> {
    const municipio = aemetMunicipio?.trim() || municipioAemetPorCoordenadas(latitud, longitud) || process.env.AEMET_MUNICIPIO?.trim();
    if (!municipio) {
      throw new Error("AEMET: falta AEMET_MUNICIPIO para la predicción");
    }
    const datos = await pedirDatos(
      `/prediccion/especifica/municipio/horaria/${municipio}`,
    );
    return normalizarHorarioAemet(datos, latitud, longitud);
  },

  async getWarnings(): Promise<OfficialWarning[]> {
    const area = resolverAreaCap();
    const { json, tar } = await pedirAvisosCap(
      `/avisos_cap/ultimoelaborado/area/${area}`,
    );
    if (json) return normalizarAvisos(json);
    if (tar) return normalizarAvisosTar(tar);
    return [];
  },
};
