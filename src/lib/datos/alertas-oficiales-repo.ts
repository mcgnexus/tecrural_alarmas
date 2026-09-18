import { desc, sql } from "drizzle-orm";
import { obtenerDb } from "./db";
import { avisosOficiales } from "./plataforma-schema";
import type { OfficialWarning } from "@/lib/dominio/proveedores";

type FilaAviso = typeof avisosOficiales.$inferSelect;

function aFecha(valor: string | undefined): Date | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function aOfficialWarning(fila: FilaAviso): OfficialWarning {
  return {
    id: fila.externalId,
    provider: fila.provider,
    phenomenon: fila.phenomenon,
    severity: fila.severity,
    startsAt: fila.startsAt?.toISOString() ?? "",
    endsAt: fila.endsAt?.toISOString() ?? "",
    area: fila.areaName ?? "",
    headline: fila.headline,
    description: fila.description ?? undefined,
    sourceUrl: fila.sourceUrl ?? undefined,
  };
}

/** Inserta/actualiza avisos oficiales (idempotente por `provider` + `external_id`). */
export async function guardarAvisosOficiales(
  avisos: OfficialWarning[],
  rawPorId?: Map<string, unknown>,
): Promise<number> {
  if (avisos.length === 0) return 0;
  const db = obtenerDb();
  const valores = avisos.map((aviso) => ({
    provider: aviso.provider,
    externalId: aviso.id,
    phenomenon: aviso.phenomenon,
    severity: aviso.severity,
    areaCode: null,
    areaName: aviso.area || null,
    startsAt: aFecha(aviso.startsAt),
    endsAt: aFecha(aviso.endsAt),
    headline: aviso.headline,
    description: aviso.description ?? null,
    sourceUrl: aviso.sourceUrl ?? null,
    rawPayload: (rawPorId?.get(aviso.id) as Record<string, unknown>) ?? {},
    updatedAt: new Date(),
  }));

  await db
    .insert(avisosOficiales)
    .values(valores)
    .onConflictDoUpdate({
      target: [avisosOficiales.provider, avisosOficiales.externalId],
      set: {
        phenomenon: sql`excluded.phenomenon`,
        severity: sql`excluded.severity`,
        areaName: sql`excluded.area_name`,
        startsAt: sql`excluded.starts_at`,
        endsAt: sql`excluded.ends_at`,
        headline: sql`excluded.headline`,
        description: sql`excluded.description`,
        sourceUrl: sql`excluded.source_url`,
        rawPayload: sql`excluded.raw_payload`,
        updatedAt: sql`now()`,
      },
    });

  return avisos.length;
}

export async function listarAvisosOficiales(
  limite = 100,
): Promise<OfficialWarning[]> {
  const db = obtenerDb();
  const filas = await db
    .select()
    .from(avisosOficiales)
    .orderBy(desc(avisosOficiales.startsAt))
    .limit(limite);
  return filas.map(aOfficialWarning);
}
