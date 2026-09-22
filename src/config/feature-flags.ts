/**
 * Fase 8 — Feature flags para MVP público.
 * Premium conservado (componentes/tablas/reglas/endpoints/sensores/diagnóstico/informes) pero oculto.
 * No confiar solo en ocultar botones: backend debe autorizar.
 */

export const PUBLIC_MVP_MODE = true;

// Env overrides — por defecto false en MVP público
export const FEATURE_FLAGS = {
  advancedServices: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_SERVICES === "true",
  diagnosis: process.env.NEXT_PUBLIC_ENABLE_DIAGNOSIS === "true",
  sensors: process.env.NEXT_PUBLIC_ENABLE_SENSORS === "true",
  reports: process.env.NEXT_PUBLIC_ENABLE_REPORTS === "true",
  technicalFollowup: process.env.NEXT_PUBLIC_ENABLE_TECHNICAL_FOLLOWUP === "true",
  multiplePlots: process.env.NEXT_PUBLIC_ENABLE_MULTIPLE_PLOTS === "true",
  phytosanitary: process.env.NEXT_PUBLIC_ENABLE_PHYTOSANITARY === "true",
} as const;

export type FlagFeature = keyof typeof FEATURE_FLAGS;

const FLAG_BY_FEATURE: Record<string, FlagFeature | null> = {
  sensors: "sensors",
  image_diagnosis: "diagnosis",
  reports: "reports",
  technical_followup: "technicalFollowup",
  multiple_plots: "multiplePlots",
  phytosanitary_alert: "phytosanitary",
  // weather/frost/wind siempre habilitados en MVP
};

export function isFlagEnabled(feature: string): boolean {
  const flag = FLAG_BY_FEATURE[feature];
  if (!flag) return true; // free features sin flag
  if (!PUBLIC_MVP_MODE) return true; // fuera MVP, todo según plan
  return FEATURE_FLAGS[flag] === true;
}
