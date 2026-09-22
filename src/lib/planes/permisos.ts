/**
 * Capa centralizada de permisos por plan — Fase 4.
 * No hardcodear `if (plan==='pro')` disperso: usar `canUseFeature(plan, feature)`.
 * Fuente única de verdad para qué ve el usuario gratuito vs premium.
 */

export type Plan = "free" | "essential" | "monitor" | "pro" | "cooperative";

export type Feature =
  | "weather_current"
  | "weather_forecast"
  | "frost_alert"
  | "wind_alert"
  | "rain_alert"
  | "heat_alert"
  | "water_demand"
  | "phytosanitary_alert"
  | "multiple_plots"
  | "sensors"
  | "image_diagnosis"
  | "reports"
  | "technical_followup"
  // aliases útiles para UI existente
  | "official_alerts";

export const PLAN_FEATURES: Record<Plan, readonly Feature[]> = {
  free: [
    "weather_current",
    "weather_forecast",
    "frost_alert",
    "wind_alert",
  ],
  essential: [
    "weather_current",
    "weather_forecast",
    "frost_alert",
    "wind_alert",
    "rain_alert",
    "heat_alert",
  ],
  monitor: [
    "weather_current",
    "weather_forecast",
    "frost_alert",
    "wind_alert",
    "rain_alert",
    "heat_alert",
    "water_demand",
    "multiple_plots",
    "sensors",
  ],
  pro: [
    "weather_current",
    "weather_forecast",
    "frost_alert",
    "wind_alert",
    "rain_alert",
    "heat_alert",
    "water_demand",
    "phytosanitary_alert",
    "multiple_plots",
    "sensors",
    "image_diagnosis",
    "reports",
    "technical_followup",
  ],
  cooperative: [
    "weather_current",
    "weather_forecast",
    "frost_alert",
    "wind_alert",
    "rain_alert",
    "heat_alert",
    "water_demand",
    "phytosanitary_alert",
    "multiple_plots",
    "sensors",
    "image_diagnosis",
    "reports",
    "technical_followup",
  ],
} as const;

/**
 * ¿Puede el plan usar la funcionalidad?
 * Uso: `if (!canUseFeature(plan, "rain_alert")) return <GatePremium />`
 * No mostrar funcionalidad gratuita si requiere suscripción.
 */
export function canUseFeature(plan: Plan, feature: Feature): boolean {
  const allowed = PLAN_FEATURES[plan];
  if (!allowed) return false;
  // alias: official_alerts siempre gratis si tiene weather_current
  if (feature === "official_alerts") return allowed.includes("weather_current");
  const planOk = (allowed as readonly string[]).includes(feature);
  if (!planOk) return false;
  // Fase 8: flag por entorno — si PUBLIC_MVP_MODE y flag deshabilitado, aunque plan lo permita, ocultar
  // evitar importar circular: require dinámico
  try {
    const { isFlagEnabled } = require("@/config/feature-flags") as typeof import("@/config/feature-flags");
    if (!isFlagEnabled(feature)) return false;
  } catch {}
  return true;
}

/** Gate servidor: plan + flag — no confiar solo en ocultar botones. */
export function canAccessServer(plan: Plan, feature: Feature): boolean {
  return canUseFeature(plan, feature);
}

/** Plan efectivo del usuario — hoy todos `free` hasta integrar facturación. */
export function planForUser(_userId?: string | null): Plan {
  // TODO premium: resolver desde `plataforma.users.plan` o `lead_scores` cuando exista.
  // No hardcodear en componentes; centralizar aquí.
  return "free";
}

/** Gate helper para UI premium oculta en Fase 3. */
export function requiresPlan(feature: Feature): Plan {
  // Plan mínimo que desbloquea la feature
  const order: Plan[] = ["free", "essential", "monitor", "pro", "cooperative"];
  for (const p of order) if (canUseFeature(p, feature)) return p;
  return "pro";
}
