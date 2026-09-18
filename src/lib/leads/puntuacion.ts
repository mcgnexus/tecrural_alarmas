import type { EstadoLead, NivelLead } from "@/lib/dominio/leads";

/** Umbrales de score para cualificar un lead (configurables en un solo punto). */
export const UMBRALES_NIVEL = {
  tibio: 20,
  caliente: 50,
  cualificado: 90,
} as const;

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
  if (score >= UMBRALES_NIVEL.cualificado) return "cualificado";
  if (score >= UMBRALES_NIVEL.caliente) return "caliente";
  if (score >= UMBRALES_NIVEL.tibio) return "tibio";
  return "frio";
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
