import type { RiskEvaluation } from "@/lib/dominio/evaluacion";
import type { RiskEvent, RiskLevel } from "@/lib/dominio/riesgo";

const ORDEN: Record<string, number> = { green: 0, yellow: 1, orange: 2, red: 3, GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 };

/** Ventana para dedup: bucket de 6h */
export function ventanaEvento(fecha: Date, hours = 6): string {
  const ms = hours * 60 * 60 * 1000;
  const bucket = Math.floor(fecha.getTime() / ms);
  return String(bucket);
}

/** Umbrales de intensidad por riskType para decidir cambio significativo */
export const UMBRAL_INTENSIDAD: Record<string, number> = {
  helada: 1.0, // °C — ejemplo spec: -1.2→-1.3 (0.1) no envía, -1.2→-3.5 (2.3) sí
  "golpe-de-calor": 1.0,
  lluvia: 5, // mm en 24h
  tormenta: 10, // km/h o puntos score
  viento: 10, // km/h racha
  "demanda-hidrica": 10, // mm déficit
  fitosanitario: 0.5,
  default: 5,
};

export function umbralPara(riskType: string): number {
  return UMBRAL_INTENSIDAD[riskType] ?? UMBRAL_INTENSIDAD.default;
}

/**
 * dedupKey = userId + plotId + riskType + eventTimeWindow + level
 * Bucketiza startsAt en ventana de 12h para el ejemplo diario.
 */
export function claveDedup(input: {
  userId: string;
  plotId: string;
  riskType: string;
  startsAt: Date;
  level: RiskLevel | string;
  ventanaHours?: number;
}): string {
  const ventana = ventanaEvento(input.startsAt, input.ventanaHours ?? 12);
  return `${input.userId}:${input.plotId}:${input.riskType}:${ventana}:${String(input.level).toLowerCase()}`;
}

/** Extrae intensidad numérica comparable por tipo */
export function intensidadDe(
  riskType: string,
  reason: Record<string, unknown>,
  score: number | null,
): number | null {
  if (typeof score === "number" && Number.isFinite(score)) return score;

  const r = reason as Record<string, unknown>;
  // helada
  if (riskType === "helada" && typeof r.temperatureMinC === "number") return r.temperatureMinC as number;
  // calor
  if ((riskType === "golpe-de-calor" || riskType === "calor") && typeof r.temperatureMaxC === "number") return r.temperatureMaxC as number;
  // viento
  if (riskType === "viento" && typeof r.windGustMaxKmh === "number") return r.windGustMaxKmh as number;
  // lluvia
  if (riskType === "lluvia") {
    if (typeof r.rain24hMm === "number") return r.rain24hMm as number;
    if (typeof r.rain1hMm === "number") return r.rain1hMm as number;
  }
  // tormenta
  if (riskType === "tormenta" && typeof r.windGustKmh === "number") return r.windGustKmh as number;
  // demanda hídrica
  if (riskType === "demanda-hidrica") {
    if (typeof r.waterDeficitIndex === "number") return r.waterDeficitIndex as number;
    if (typeof r.score === "number") return r.score as number;
  }
  // genérico
  if (typeof r.score === "number") return r.score as number;
  if (typeof r.intensidad === "number") return r.intensidad as number;
  return null;
}

export interface DecisionDedup {
  enviar: boolean;
  razon: string;
  dedupKey: string;
  diffIntensidad: number | null;
  diffHoras: number | null;
  escalado: boolean;
  oficialNuevo: boolean;
}

/**
 * Decide si enviar nueva notificación.
 * Condiciones (OR):
 * - nivel cambia a superior
 * - hora del evento cambia significativamente (> ventanaHoras)
 * - intensidad cambia por encima del threshold
 * - aparece aviso oficial nuevo
 */
export function decidirNotificacion(input: {
  userId: string;
  plotId: string;
  previo: RiskEvent | null;
  actual: RiskEvaluation;
  ventanaHoras?: number;
  umbralOverride?: number;
}): DecisionDedup {
  const { userId, plotId, previo, actual, ventanaHoras = 6, umbralOverride } = input;
  const dedupKey = claveDedup({
    userId,
    plotId,
    riskType: actual.riskType,
    startsAt: actual.startsAt,
    level: actual.level,
    ventanaHours: 12,
  });

  if (!previo) {
    // primera vez: notificar si no es verde (verde no se persiste de todos modos)
    const lvl = String(actual.level).toLowerCase();
    return {
      enviar: lvl !== "green",
      razon: "primer_evento",
      dedupKey,
      diffIntensidad: null,
      diffHoras: null,
      escalado: false,
      oficialNuevo: false,
    };
  }

  const escalado = (ORDEN[String(actual.level)] ?? 0) > (ORDEN[String(previo.level)] ?? 0);

  const prevStarts = new Date(previo.startsAt).getTime();
  const currStarts = actual.startsAt.getTime();
  const diffMs = Math.abs(currStarts - prevStarts);
  const diffHoras = diffMs / (60 * 60 * 1000);
  const horaSignificativa = diffHoras >= ventanaHoras;

  const intensidadPrev = intensidadDe(previo.riskType, previo.reason as Record<string, unknown>, previo.score);
  const intensidadCurr = intensidadDe(actual.riskType, actual.reason as Record<string, unknown>, actual.score);
  let diffIntensidad: number | null = null;
  let intensidadSignificativa = false;
  if (intensidadPrev !== null && intensidadCurr !== null) {
    diffIntensidad = Math.abs(intensidadCurr - intensidadPrev);
    const umbral = umbralOverride ?? umbralPara(actual.riskType);
    intensidadSignificativa = diffIntensidad >= umbral;
  } else if (intensidadCurr !== null && intensidadPrev === null) {
    // si antes no había intensidad (ej. aviso oficial), considerar significativo si hay score ahora
    diffIntensidad = Math.abs(intensidadCurr);
    intensidadSignificativa = false;
  }

  // aviso oficial nuevo: detectar si el actual es oficial y el previo no, o ids distintos
  const esOficial = (actual.reason as Record<string, unknown>).source === "official";
  const prevEsOficial = (previo.reason as Record<string, unknown>)?.source === "official";
  let oficialNuevo = false;
  if (esOficial && !prevEsOficial) oficialNuevo = true;
  if (esOficial && prevEsOficial) {
    const prevProv = (previo.reason as Record<string, unknown>).provider as string | undefined;
    const currProv = (actual.reason as Record<string, unknown>).provider as string | undefined;
    const prevPhen = (previo.reason as Record<string, unknown>).phenomenon as string | undefined;
    const currPhen = (actual.reason as Record<string, unknown>).phenomenon as string | undefined;
    if (prevProv !== currProv || prevPhen !== currPhen) oficialNuevo = true;
    // si ids/start difieren lanzamos también
    const prevStartOff = (previo.reason as Record<string, unknown>).startsAt as string | undefined;
    const currStartOff = (actual.reason as Record<string, unknown>).startsAt as string | undefined;
    if (prevStartOff && currStartOff && prevStartOff !== currStartOff) oficialNuevo = true;
  }

  const enviar = escalado || horaSignificativa || intensidadSignificativa || oficialNuevo;
  const razon = escalado
    ? "nivel_superior"
    : oficialNuevo
      ? "aviso_oficial_nuevo"
      : horaSignificativa
        ? "hora_significativa"
        : intensidadSignificativa
          ? "intensidad_umbral"
          : "sin_cambio_significativo";

  return { enviar, razon, dedupKey, diffIntensidad, diffHoras, escalado, oficialNuevo };
}

// --- Helpers para esquema `campo` (barrido) ---

export function intensidadDeMensaje(tipo: string, mensaje: string): number | null {
  // Extrae primer número seguido de °C, mm o km/h
  const patrones: Record<string, RegExp> = {
    helada: /(-?\d+(?:[.,]\d+)?)\s*°C/,
    "golpe-de-calor": /(-?\d+(?:[.,]\d+)?)\s*°C/,
    viento: /(-?\d+(?:[.,]\d+)?)\s*km\/h/,
    lluvia: /(-?\d+(?:[.,]\d+)?)\s*mm/,
    tormenta: /(-?\d+(?:[.,]\d+)?)\s*(?:km\/h|mm|%)/,
    "demanda-hidrica": /(-?\d+(?:[.,]\d+)?)\s*mm/,
  };
  const re = patrones[tipo] ?? /(-?\d+(?:[.,]\d+)?)/;
  const m = mensaje.match(re);
  if (!m) return null;
  const n = Number(m[1]!.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function debeNotificarCampo(input: {
  previo: { severidad: string; mensaje: string; emisorAt: string; fuente?: string } | null;
  actual: { tipo: string; severidad: string; mensaje: string; emisorAt: string; fuente?: string };
  ventanaHoras?: number;
}): { enviar: boolean; razon: string; diffIntensidad: number | null; diffHoras: number | null } {
  const { previo, actual, ventanaHoras = 6 } = input;
  if (!previo) return { enviar: actual.severidad !== "info", razon: "primer_evento", diffIntensidad: null, diffHoras: null };
  const orden: Record<string, number> = { info: 0, aviso: 1, alerta: 2, critica: 3 };
  const escalado = (orden[actual.severidad] ?? 0) > (orden[previo.severidad] ?? 0);
  const diffHoras = Math.abs(new Date(actual.emisorAt).getTime() - new Date(previo.emisorAt).getTime()) / 3600000;
  const horaSig = diffHoras >= ventanaHoras;
  const prevInt = intensidadDeMensaje(actual.tipo, previo.mensaje);
  const currInt = intensidadDeMensaje(actual.tipo, actual.mensaje);
  let diffIntensidad: number | null = null;
  let intSig = false;
  if (prevInt !== null && currInt !== null) {
    diffIntensidad = Math.abs(currInt - prevInt);
    intSig = diffIntensidad >= umbralPara(actual.tipo);
  }
  const oficialNuevo = !!actual.fuente?.includes("oficial") && !previo.fuente?.includes("oficial");
  const enviar = escalado || horaSig || intSig || oficialNuevo;
  const razon = escalado ? "nivel_superior" : oficialNuevo ? "aviso_oficial_nuevo" : horaSig ? "hora_significativa" : intSig ? "intensidad_umbral" : "sin_cambio_significativo";
  return { enviar, razon, diffIntensidad, diffHoras };
}
