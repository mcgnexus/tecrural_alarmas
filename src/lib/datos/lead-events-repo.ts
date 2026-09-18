import { and, desc, eq, sql } from "drizzle-orm";
import { obtenerDb } from "./db";
import { eventosLead } from "./plataforma-schema";
import type { LeadEvent, LeadEventInput } from "@/lib/dominio/lead-events";

type Fila = typeof eventosLead.$inferSelect;

function aDto(fila: Fila): LeadEvent {
  return {
    id: fila.id,
    userId: fila.userId,
    anonymousId: fila.anonymousId,
    plotId: fila.plotId,
    eventType: fila.eventType,
    metadata: fila.metadata,
    points: fila.points,
    createdAt: fila.createdAt.toISOString(),
  };
}

export async function registrarLeadEvent(
  input: LeadEventInput,
): Promise<string> {
  const db = obtenerDb();
  const [fila] = await db
    .insert(eventosLead)
    .values({
      userId: input.userId ?? null,
      anonymousId: input.anonymousId ?? null,
      plotId: input.plotId ?? null,
      eventType: input.eventType,
      metadata: input.metadata ?? {},
      points: input.points ?? 0,
    })
    .returning({ id: eventosLead.id });
  if (!fila) throw new Error("No se pudo registrar el evento de lead.");
  return fila.id;
}

export async function listarLeadEvents(
  filtros: {
    anonymousId?: string;
    userId?: string;
    plotId?: string;
    eventType?: string;
    limite?: number;
  } = {},
): Promise<LeadEvent[]> {
  const db = obtenerDb();
  const condiciones = [];
  if (filtros.anonymousId) {
    condiciones.push(eq(eventosLead.anonymousId, filtros.anonymousId));
  }
  if (filtros.userId) condiciones.push(eq(eventosLead.userId, filtros.userId));
  if (filtros.plotId) condiciones.push(eq(eventosLead.plotId, filtros.plotId));
  if (filtros.eventType) {
    condiciones.push(eq(eventosLead.eventType, filtros.eventType));
  }

  const filas = await db
    .select()
    .from(eventosLead)
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(desc(eventosLead.createdAt))
    .limit(filtros.limite ?? 100);
  return filas.map(aDto);
}

export async function puntosLead(anonymousId: string): Promise<number> {
  const db = obtenerDb();
  const [agregado] = await db
    .select({ total: sql<number>`coalesce(sum(${eventosLead.points}), 0)::int` })
    .from(eventosLead)
    .where(eq(eventosLead.anonymousId, anonymousId));
  return agregado?.total ?? 0;
}
