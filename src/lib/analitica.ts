import { track } from "@vercel/analytics";
import { asegurarSesionDispositivo } from "@/lib/datos/dispositivo";
import type { LeadEventType } from "@/lib/dominio/lead-events";

/**
 * Eventos del embudo comercial. Vercel Analytics aporta el tráfico general;
 * estos eventos concretos siguen el funnel de captura de leads.
 */
export type EventoEmbudo =
  | "click_whatsapp"
  | "lead_started"
  | "lead_submitted"
  | "municipality_selected"
  | "service_interest_selected"
  | "ai_conversation_started";

/** `telegram_notification_sent` se registra en servidor (log estructurado). */

/**
 * Traducción del embudo (cliente) a los tipos de lead del servidor. `null`
 * significa que ya se registra por otra vía (p. ej. el envío del formulario
 * crea CONTACT_REQUESTED en `/api/contacto`).
 */
const EVENTO_LEAD: Record<EventoEmbudo, LeadEventType | null> = {
  click_whatsapp: "CONTACT_REQUESTED",
  lead_started: null,
  lead_submitted: null,
  municipality_selected: "LOCATION_SELECTED",
  service_interest_selected: null,
  ai_conversation_started: "APP_VISIT",
};

/** Persiste el evento de embudo en el CRM (scoring anónimo). Fire-and-forget. */
async function registrarLeadServidor(
  evento: EventoEmbudo,
  datos?: Record<string, string | number | boolean | null>,
): Promise<void> {
  const type = EVENTO_LEAD[evento];
  if (!type) return;
  try {
    await asegurarSesionDispositivo();
    await fetch("/api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, metadata: datos ?? undefined }),
    });
  } catch {
    // El funnel nunca rompe la UI.
  }
}

export function registrarEventoEmbudo(
  evento: EventoEmbudo,
  datos?: Record<string, string | number | boolean | null>,
): void {
  try {
    track(evento, datos);
  } catch {
    // La analítica nunca rompe la UI (fuera de Vercel es no-op).
  }
  void registrarLeadServidor(evento, datos);
}
