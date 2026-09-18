import { eq, sql } from "drizzle-orm";
import { obtenerDb } from "./db";
import {
  configPuntosLead,
  eventosLead,
  puntuacionesLead,
} from "./plataforma-schema";
import { clasificarLead } from "@/lib/dominio/lead-scores";
import type { LeadScore, PuntajeLead } from "@/lib/dominio/lead-scores";

/** Puntuaciones configurables por tipo de evento. */
export async function obtenerPuntosLeadConfig(): Promise<Map<string, number>> {
  const db = obtenerDb();
  const filas = await db
    .select({
      eventType: configPuntosLead.eventType,
      points: configPuntosLead.points,
    })
    .from(configPuntosLead);
  return new Map(filas.map((f) => [f.eventType, f.points]));
}

async function sumarPuntos(filtro: {
  userId?: string;
  anonymousId?: string;
}): Promise<{ score: number; lastActivityAt: Date | null }> {
  const db = obtenerDb();
  const condicion = filtro.userId
    ? eq(eventosLead.userId, filtro.userId)
    : eq(eventosLead.anonymousId, filtro.anonymousId ?? "");

  const [fila] = await db
    .select({
      total: sql<number>`coalesce(sum(${eventosLead.points}), 0)::int`,
      ultimo: sql<Date | null>`max(${eventosLead.createdAt})`,
    })
    .from(eventosLead)
    .where(condicion);

  const ultimo = fila?.ultimo ?? null;
  const lastActivityAt = ultimo
    ? new Date(ultimo as unknown as string | Date)
    : null;

  return { score: fila?.total ?? 0, lastActivityAt };
}

/** Puntaje de un visitante anónimo: se calcula al vuelo, no se persiste. */
export async function puntajeAnonimo(
  anonymousId: string,
): Promise<PuntajeLead> {
  const { score } = await sumarPuntos({ anonymousId });
  return { score, classification: clasificarLead(score) };
}

/** Recalcula y persiste la puntuación de un usuario registrado. */
export async function recalcularLeadScoreUsuario(
  userId: string,
): Promise<LeadScore> {
  const db = obtenerDb();
  const { score, lastActivityAt } = await sumarPuntos({ userId });
  const classification = clasificarLead(score);
  const ahora = new Date();

  await db
    .insert(puntuacionesLead)
    .values({
      userId,
      score,
      classification,
      lastActivityAt,
      updatedAt: ahora,
    })
    .onConflictDoUpdate({
      target: puntuacionesLead.userId,
      set: {
        score: sql`excluded.score`,
        classification: sql`excluded.classification`,
        lastActivityAt: sql`excluded.last_activity_at`,
        updatedAt: sql`now()`,
      },
    });

  return {
    userId,
    score,
    classification,
    lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
    updatedAt: ahora.toISOString(),
  };
}

export async function obtenerLeadScoreUsuario(
  userId: string,
): Promise<LeadScore | null> {
  const db = obtenerDb();
  const [fila] = await db
    .select()
    .from(puntuacionesLead)
    .where(eq(puntuacionesLead.userId, userId))
    .limit(1);
  if (!fila) return null;
  return {
    userId: fila.userId,
    score: fila.score,
    classification: fila.classification as LeadScore["classification"],
    lastActivityAt: fila.lastActivityAt ? fila.lastActivityAt.toISOString() : null,
    updatedAt: fila.updatedAt.toISOString(),
  };
}
