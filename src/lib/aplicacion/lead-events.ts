import { registrarLeadEvent } from "@/lib/datos/lead-events-repo";
import {
  obtenerPuntosLeadConfig,
  recalcularLeadScoreUsuario,
} from "@/lib/datos/lead-scores-repo";
import { crearLogger } from "@/lib/log/logger";
import type { LeadEventInput, LeadEventType } from "@/lib/dominio/lead-events";

const log = crearLogger("aplicacion.lead-events");

/** Traduce los eventos internos de señal a los tipos del funnel de lead. */
export function tipoLeadEvento(
  evento: string,
  intereses: string[] = [],
): LeadEventType | null {
  if (intereses.includes("SENSORS")) return "SENSOR_CTA_CLICKED";
  if (intereses.includes("IRRIGATION")) return "IRRIGATION_CTA_CLICKED";

  switch (evento) {
    case "parcela_anadida":
    case "explotacion_creada":
      return "PLOT_CREATED";
    case "avisos_activados":
      return "ALERTS_ENABLED";
    case "riego_consultado":
      return "WATER_VIEWED";
    case "diagnostico_usado":
      return "AI_DIAGNOSIS_STARTED";
    case "consulta_meteorologia":
      return "APP_VISIT";
    case "presupuesto_intent":
    case "presupuesto_solicitado":
      return "QUOTE_REQUESTED";
    case "whatsapp_contact":
    case "contact_requested":
    case "solicitar_informacion":
      return "CONTACT_REQUESTED";
    default:
      return intereses.length > 0 ? "SENSOR_CTA_VIEWED" : null;
  }
}

/**
 * Registra un evento de lead con los puntos de `plataforma.lead_scoring_config`
 * (nunca desde el cliente) y recalcula la puntuación si es un usuario.
 */
export async function registrarEventoLead(
  input: Omit<LeadEventInput, "points">,
): Promise<{ id: string; points: number }> {
  const puntos = (await obtenerPuntosLeadConfig()).get(input.eventType) ?? 0;
  const id = await registrarLeadEvent({ ...input, points: puntos });

  if (input.userId) {
    try {
      await recalcularLeadScoreUsuario(input.userId);
    } catch (error) {
      log.warn(
        "lead.score.recalculo.error",
        { external_source: "lead-events" },
        error,
      );
    }
  }

  log.info("lead.evento.registrado", {
    external_source: "lead-events",
    data: { eventType: input.eventType, points: puntos },
  });
  return { id, points: puntos };
}

/** Variante tolerante: el funnel nunca debe tumbar el flujo principal. */
export async function registrarEventoLeadSeguro(
  input: Omit<LeadEventInput, "points">,
): Promise<void> {
  try {
    await registrarEventoLead(input);
  } catch (error) {
    log.warn("lead.evento.error", { external_source: "lead-events" }, error);
  }
}
