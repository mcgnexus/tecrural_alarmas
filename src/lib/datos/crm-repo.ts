import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { obtenerDb } from "./db";
import {
  leadEvents,
  leadInterests,
  leadScoringConfig,
  leadsCrm,
  serviceOffers,
} from "./crm-schema";

export async function obtenerPesosScoring(): Promise<Map<string, number>> {
  const db = obtenerDb();
  const filas = await db
    .select({
      eventKey: leadScoringConfig.eventKey,
      weight: leadScoringConfig.weight,
    })
    .from(leadScoringConfig);
  return new Map(filas.map((f) => [f.eventKey, f.weight]));
}

export async function obtenerOCrearLead(
  visitorId: string,
  datos?: { source?: string; cropType?: string; serviceKey?: string },
): Promise<typeof leadsCrm.$inferSelect> {
  const db = obtenerDb();
  const [existente] = await db
    .select()
    .from(leadsCrm)
    .where(and(eq(leadsCrm.visitorId, visitorId), isNull(leadsCrm.mergedIntoLeadId)))
    .orderBy(desc(leadsCrm.createdAt))
    .limit(1);
  if (existente) return existente;

  const [creado] = await db
    .insert(leadsCrm)
    .values({
      visitorId,
      source: datos?.source ?? "app_campo",
      cropType: datos?.cropType ?? null,
      serviceKey: datos?.serviceKey ?? null,
    })
    .returning();
  if (!creado) throw new Error("No se pudo crear el lead.");
  return creado;
}

export async function registrarEventoLead(input: {
  leadId: string;
  tipo: string;
  peso: number;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const db = obtenerDb();
  await db.insert(leadEvents).values({
    leadId: input.leadId,
    type: input.tipo,
    weight: input.peso,
    metadata: input.metadata ?? null,
  });
}

export async function registrarInteresLead(
  leadId: string,
  interest: string,
): Promise<void> {
  const db = obtenerDb();
  await db.insert(leadInterests).values({ leadId, interest }).onConflictDoNothing();
}

export async function recalcularScoreLead(leadId: string): Promise<number> {
  const db = obtenerDb();
  const [agregado] = await db
    .select({ total: sql<number>`coalesce(sum(${leadEvents.weight}), 0)::int` })
    .from(leadEvents)
    .where(eq(leadEvents.leadId, leadId));
  const score = agregado?.total ?? 0;
  await db
    .update(leadsCrm)
    .set({ score, lastEventAt: new Date() })
    .where(eq(leadsCrm.id, leadId));
  return score;
}

export async function actualizarEstadoLead(
  leadId: string,
  estado: string,
): Promise<void> {
  const db = obtenerDb();
  await db.update(leadsCrm).set({ status: estado }).where(eq(leadsCrm.id, leadId));
}

export async function obtenerLeadPorVisitante(
  visitorId: string,
): Promise<typeof leadsCrm.$inferSelect | null> {
  const db = obtenerDb();
  const [lead] = await db
    .select()
    .from(leadsCrm)
    .where(eq(leadsCrm.visitorId, visitorId))
    .orderBy(desc(leadsCrm.createdAt))
    .limit(1);
  return lead ?? null;
}

export async function listarInteresesLead(leadId: string): Promise<string[]> {
  const db = obtenerDb();
  const filas = await db
    .select({ interest: leadInterests.interest })
    .from(leadInterests)
    .where(eq(leadInterests.leadId, leadId))
    .orderBy(asc(leadInterests.createdAt));
  return filas.map((f) => f.interest);
}

export async function listarEventosLead(leadId: string, limite = 20) {
  const db = obtenerDb();
  return db
    .select({
      type: leadEvents.type,
      weight: leadEvents.weight,
      createdAt: leadEvents.createdAt,
    })
    .from(leadEvents)
    .where(eq(leadEvents.leadId, leadId))
    .orderBy(desc(leadEvents.createdAt))
    .limit(limite);
}

export async function listarOfertasServicio() {
  const db = obtenerDb();
  return db
    .select()
    .from(serviceOffers)
    .where(eq(serviceOffers.active, true))
    .orderBy(asc(serviceOffers.sortOrder));
}
