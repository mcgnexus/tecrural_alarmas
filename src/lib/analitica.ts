import { track } from "@vercel/analytics";
import { asegurarSesionDispositivo } from "@/lib/datos/dispositivo";
import type { LeadEventType } from "@/lib/dominio/lead-events";

/**
 * Fase 9 — Eventos accionables MVP (no vanity: visitas/páginas/impresiones).
 */
export type EventoEmbudo =
  | "municipality_selected"
  | "crop_selected"
  | "weather_viewed"
  | "forecast_viewed"
  | "frost_alert_viewed"
  | "wind_alert_viewed"
  | "lead_form_started"
  | "lead_form_submitted"
  | "lead_form_error"
  | "whatsapp_clicked"
  | "premium_feature_locked"
  // legacy alias para no romper calls existentes
  | "click_whatsapp"
  | "lead_started"
  | "lead_submitted"
  | "service_interest_selected"
  | "ai_conversation_started";

const EVENTO_LEAD: Record<EventoEmbudo, LeadEventType | null> = {
  municipality_selected: "LOCATION_SELECTED",
  crop_selected: "CROP_SELECTED",
  weather_viewed: null,
  forecast_viewed: null,
  frost_alert_viewed: "ALERT_OPENED",
  wind_alert_viewed: "ALERT_OPENED",
  lead_form_started: null,
  lead_form_submitted: "CONTACT_REQUESTED",
  lead_form_error: null,
  whatsapp_clicked: "CONTACT_REQUESTED",
  premium_feature_locked: null,
  // legacy
  click_whatsapp: "CONTACT_REQUESTED",
  lead_started: null,
  lead_submitted: "CONTACT_REQUESTED",
  service_interest_selected: null,
  ai_conversation_started: "APP_VISIT",
};

async function registrarLeadServidor(
  evento: EventoEmbudo,
  datos?: Record<string, string | number | boolean | null>,
): Promise<void> {
  const type = EVENTO_LEAD[evento];
  if (!type) return;
  try {
    await asegurarSesionDispositivo();
    const anonymousId = typeof window !== "undefined" ? window.localStorage.getItem("tecrural.dispositivo") : null;
    const userId = typeof window !== "undefined" ? window.localStorage.getItem("tecrural.usuario") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (anonymousId) headers["x-anonymous-id"] = anonymousId;
    if (userId) headers["x-user-id"] = userId;
    await fetch("/api/v1/events", {
      method: "POST",
      headers,
      body: JSON.stringify({ type, metadata: datos ?? undefined, anonymousId: anonymousId ?? undefined, userId: userId ?? undefined }),
    });
  } catch {}
}

export function registrarEventoEmbudo(
  evento: EventoEmbudo,
  datos?: Record<string, string | number | boolean | null>,
): void {
  try {
    track(evento, datos);
  } catch {}
  void registrarLeadServidor(evento, datos);
}
