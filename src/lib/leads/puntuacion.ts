import { clasificarLead } from "@/lib/dominio/lead-scores";
import type { LeadClassification } from "@/lib/dominio/lead-scores";
import type { EstadoLead, NivelLead } from "@/lib/dominio/leads";

/**
 * Umbral de cualificación: tier superior de negocio, por encima de la
 * clasificación comercial (ver `RANGOS_LEAD`). Único punto de ajuste.
 */
export const UMBRAL_CUALIFICADO = 90;

/** Traduce la clasificación comercial canónica a los niveles del CRM. */
const NIVEL_POR_CLASIFICACION: Record<LeadClassification, NivelLead> = {
  usuario: "frio",
  frio: "frio",
  templado: "tibio",
  caliente: "caliente",
};

const ESTADO_POR_NIVEL: Record<NivelLead, EstadoLead> = {
  frio: "NEW",
  tibio: "WARM",
  caliente: "HOT",
  cualificado: "QUALIFIED",
};

export const ORDEN_ESTADO: Record<string, number> = {
  DISCARDED: -1,
  NEW: 0,
  WARM: 1,
  HOT: 2,
  QUALIFIED: 3,
  CONVERTED: 4,
};

export function nivelDesdeScore(score: number): NivelLead {
  if (score >= UMBRAL_CUALIFICADO) return "cualificado";
  return NIVEL_POR_CLASIFICACION[clasificarLead(score)];
}

export function estadoDesdeNivel(nivel: NivelLead): EstadoLead {
  return ESTADO_POR_NIVEL[nivel];
}

/** Un estado solo asciende; nunca se degrada ni se pisa uno manual superior. */
export function debeEscalarEstado(actual: string, nuevo: EstadoLead): boolean {
  const ordenActual = ORDEN_ESTADO[actual];
  const ordenNuevo = ORDEN_ESTADO[nuevo] ?? 0;
  if (ordenActual === undefined) return false;
  return ordenNuevo > ordenActual;
}
