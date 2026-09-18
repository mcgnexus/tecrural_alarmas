export type LeadClassification = "usuario" | "frio" | "templado" | "caliente";

export interface PuntajeLead {
  score: number;
  classification: LeadClassification;
}

export interface LeadScore extends PuntajeLead {
  userId: string;
  lastActivityAt: string | null;
  updatedAt: string;
}

/** Rangos de clasificación (configurables en un único punto). */
export const RANGOS_LEAD: {
  hasta: number;
  clasificacion: LeadClassification;
}[] = [
  { hasta: 5, clasificacion: "usuario" },
  { hasta: 15, clasificacion: "frio" },
  { hasta: 30, clasificacion: "templado" },
  { hasta: Number.POSITIVE_INFINITY, clasificacion: "caliente" },
];

/**
 * Clasificación comercial del lead. Este módulo es solo para negocio: NUNCA
 * debe usarse para decisiones agronómicas ni desde los motores de riesgo.
 */
export function clasificarLead(score: number): LeadClassification {
  for (const rango of RANGOS_LEAD) {
    if (score <= rango.hasta) return rango.clasificacion;
  }
  return "caliente";
}
