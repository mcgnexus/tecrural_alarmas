/**
 * Fase 5 — Estado centralizado de evaluación de alertas gratuitas (helada, viento).
 * Cumple: AlertStatus, caducidad, y no mostrar "sin riesgo" en fallo.
 */

export type AlertStatus = "pending" | "evaluating" | "active" | "no-risk" | "stale" | "failed";

export const CADUCIDAD_MIN = 90; // si supera, no mostrar como actual

export interface EvaluacionMeta {
  parcelaOMunicipio: string; // municipio o parcelaId
  cultivo: string;
  tipoRiesgo: "helada" | "viento";
  nivel: string | null;
  mensaje: string | null;
  fuente: string;
  fechaDatos: string; // fuente.consultadaEn
  fechaEvaluacion: string;
  fechaCaducidad: string;
  estado: AlertStatus;
  error?: string;
}

export function esCaducado(fechaEvaluacion: string, maxMin = CADUCIDAD_MIN): boolean {
  const diffMin = (Date.now() - new Date(fechaEvaluacion).getTime()) / 60000;
  return diffMin > maxMin;
}

export function horasDesde(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 3600000);
}

export function estadoDesdeResultado(params: {
  tieneAlerta: boolean;
  fechaEvaluacion: string;
  error?: string | null;
}): AlertStatus {
  if (params.error) return "failed";
  if (esCaducado(params.fechaEvaluacion)) return "stale";
  return params.tieneAlerta ? "active" : "no-risk";
}
