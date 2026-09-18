import { crearLogger } from "@/lib/log/logger";
import {
  actualizarEstadoLead,
  listarInteresesLead,
  obtenerLeadPorVisitante,
  obtenerOCrearLead,
  obtenerPesosScoring,
  recalcularScoreLead,
  registrarEventoLead,
  registrarInteresLead,
} from "@/lib/datos/crm-repo";
import {
  debeEscalarEstado,
  estadoDesdeNivel,
  nivelDesdeScore,
} from "@/lib/leads/puntuacion";
import type { ResumenLead } from "@/lib/dominio/leads";
import { registrarEventoLeadSeguro, tipoLeadEvento } from "./lead-events";

const log = crearLogger("aplicacion.crm");

export interface SenalCrm {
  dispositivoId: string;
  evento: string;
  intereses?: string[];
  metadata?: Record<string, unknown>;
  source?: string;
  cropType?: string;
  serviceKey?: string;
}

/**
 * Orquestación del CRM: registra la señal, aplica los pesos configurables de
 * `public.lead_scoring_config`, recalcula el score y cualifica el lead.
 */
export async function registrarSenal(senal: SenalCrm): Promise<ResumenLead> {
  const pesos = await obtenerPesosScoring();
  const lead = await obtenerOCrearLead(senal.dispositivoId, {
    source: senal.source,
    cropType: senal.cropType,
    serviceKey: senal.serviceKey,
  });

  const eventos: string[] = [senal.evento];
  for (const interes of senal.intereses ?? []) {
    eventos.push(`interest_${interes}`);
  }

  for (const tipo of eventos) {
    await registrarEventoLead({
      leadId: lead.id,
      tipo,
      peso: pesos.get(tipo) ?? 0,
      metadata: tipo === senal.evento ? (senal.metadata ?? null) : null,
    });
  }
  for (const interes of senal.intereses ?? []) {
    await registrarInteresLead(lead.id, interes);
  }

  const score = await recalcularScoreLead(lead.id);
  const nivel = nivelDesdeScore(score);
  const estadoNuevo = estadoDesdeNivel(nivel);
  const escalar = debeEscalarEstado(lead.status, estadoNuevo);
  if (escalar) {
    await actualizarEstadoLead(lead.id, estadoNuevo);
  }
  const intereses = await listarInteresesLead(lead.id);

  const tipoLead = tipoLeadEvento(senal.evento, senal.intereses ?? []);
  if (tipoLead) {
    await registrarEventoLeadSeguro({
      anonymousId: senal.dispositivoId,
      eventType: tipoLead,
      metadata: {
        evento: senal.evento,
        intereses: senal.intereses,
        ...senal.metadata,
      },
    });
  }

  log.info("crm.senal.registrada", {
    external_source: "crm",
    data: { evento: senal.evento, score, nivel },
  });

  return {
    leadId: lead.id,
    score,
    nivel,
    estado: escalar ? estadoNuevo : lead.status,
    intereses,
  };
}

/** Variante tolerante a fallos: el CRM nunca debe tumbar el flujo principal. */
export async function registrarSenalSegura(senal: SenalCrm): Promise<void> {
  try {
    await registrarSenal(senal);
  } catch (error) {
    log.warn("crm.senal.error", { external_source: "crm" }, error);
  }
}

export async function resumenLead(
  dispositivoId: string,
): Promise<ResumenLead | null> {
  const lead = await obtenerLeadPorVisitante(dispositivoId);
  if (!lead) return null;
  const intereses = await listarInteresesLead(lead.id);
  return {
    leadId: lead.id,
    score: lead.score,
    nivel: nivelDesdeScore(lead.score),
    estado: lead.status,
    intereses,
  };
}
