import { track } from "@vercel/analytics";

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

export function registrarEventoEmbudo(
  evento: EventoEmbudo,
  datos?: Record<string, string | number | boolean | null>,
): void {
  try {
    track(evento, datos);
  } catch {
    // La analítica nunca rompe la UI (fuera de Vercel es no-op).
  }
}
