import { and, desc, eq, sql } from "drizzle-orm";
import { obtenerDb } from "./db";
import { eventosRiesgo } from "./plataforma-schema";
import type { NuevoRiskEvent, RiskEvent } from "@/lib/dominio/riesgo";

type Fila = typeof eventosRiesgo.$inferSelect;

function aDto(fila: Fila): RiskEvent {
  return {
    id: fila.id,
    plotId: fila.plotId,
    riskType: fila.riskType,
    level: fila.level as RiskEvent["level"],
    score: fila.score === null ? null : Number(fila.score),
    startsAt: fila.startsAt.toISOString(),
    endsAt: fila.endsAt ? fila.endsAt.toISOString() : null,
    headline: fila.headline,
    summary: fila.summary,
    reason: fila.reason,
    ruleVersion: fila.ruleVersion,
    weatherLocationId: fila.weatherLocationId,
    status: fila.status,
    createdAt: fila.createdAt.toISOString(),
    updatedAt: fila.updatedAt.toISOString(),
  };
}

export async function guardarEventosRiesgo(
  eventos: NuevoRiskEvent[],
): Promise<number> {
  if (eventos.length === 0) return 0;
  const db = obtenerDb();
  await db.insert(eventosRiesgo).values(
    eventos.map((evento) => ({
      plotId: evento.plotId,
      riskType: evento.riskType,
      level: evento.level,
      score: evento.score === null ? null : String(evento.score),
      startsAt: evento.startsAt,
      endsAt: evento.endsAt,
      headline: evento.headline,
      summary: evento.summary,
      reason: evento.reason,
      ruleVersion: evento.ruleVersion,
      weatherLocationId: evento.weatherLocationId,
      status: evento.status,
    })),
  );
  return eventos.length;
}

export async function listarEventosRiesgo(
  filtros: {
    plotId?: string;
    riskType?: string;
    level?: string;
    status?: string;
    limite?: number;
  } = {},
): Promise<RiskEvent[]> {
  const db = obtenerDb();
  const condiciones = [];
  if (filtros.plotId) condiciones.push(eq(eventosRiesgo.plotId, filtros.plotId));
  if (filtros.riskType) {
    condiciones.push(eq(eventosRiesgo.riskType, filtros.riskType));
  }
  if (filtros.level) condiciones.push(eq(eventosRiesgo.level, filtros.level));
  if (filtros.status) condiciones.push(eq(eventosRiesgo.status, filtros.status));

  const filas = await db
    .select()
    .from(eventosRiesgo)
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(desc(eventosRiesgo.startsAt))
    .limit(filtros.limite ?? 100);
  return filas.map(aDto);
}

/** Marca como cerrados los eventos abiertos de una parcela (p. ej. al reevaluar). */
export async function cerrarEventosAbiertos(
  plotId: string,
  antesDe: Date,
): Promise<number> {
  const db = obtenerDb();
  const cerrados = await db
    .update(eventosRiesgo)
    .set({ status: "closed", endsAt: sql`${antesDe}`, updatedAt: new Date() })
    .where(
      and(
        eq(eventosRiesgo.plotId, plotId),
        eq(eventosRiesgo.status, "open"),
      ),
    )
    .returning({ id: eventosRiesgo.id });
  return cerrados.length;
}
