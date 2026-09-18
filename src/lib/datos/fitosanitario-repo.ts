import { and, desc, eq, sql } from "drizzle-orm";
import { obtenerDb } from "./db";
import { alertasFitosanitarias } from "./plataforma-schema";
import type { PhytosanitaryAlert } from "@/lib/dominio/fitosanitario";

type Fila = typeof alertasFitosanitarias.$inferSelect;

function aDto(fila: Fila): PhytosanitaryAlert {
  return {
    id: fila.id,
    provider: fila.provider,
    externalId: fila.externalId,
    cropId: fila.cropId,
    title: fila.title,
    summary: fila.summary,
    province: fila.province,
    municipality: fila.municipality,
    severity: fila.severity,
    publishedAt: fila.publishedAt.toISOString(),
    sourceUrl: fila.sourceUrl,
    rawPayload: fila.rawPayload,
  };
}

/** Inserta/actualiza alertas fitosanitarias (idempotente por provider+external_id). */
export async function guardarAlertasFitosanitarias(
  alertas: PhytosanitaryAlert[],
): Promise<number> {
  if (alertas.length === 0) return 0;
  const db = obtenerDb();
  await db
    .insert(alertasFitosanitarias)
    .values(
      alertas.map((alerta) => ({
        provider: alerta.provider,
        externalId: alerta.externalId ?? null,
        cropId: alerta.cropId ?? null,
        title: alerta.title,
        summary: alerta.summary,
        province: alerta.province ?? null,
        municipality: alerta.municipality ?? null,
        severity: alerta.severity ?? null,
        publishedAt: new Date(alerta.publishedAt),
        sourceUrl: alerta.sourceUrl ?? null,
        rawPayload: alerta.rawPayload ?? null,
      })),
    )
    .onConflictDoUpdate({
      target: [alertasFitosanitarias.provider, alertasFitosanitarias.externalId],
      set: {
        cropId: sql`excluded.crop_id`,
        title: sql`excluded.title`,
        summary: sql`excluded.summary`,
        province: sql`excluded.province`,
        municipality: sql`excluded.municipality`,
        severity: sql`excluded.severity`,
        publishedAt: sql`excluded.published_at`,
        sourceUrl: sql`excluded.source_url`,
        rawPayload: sql`excluded.raw_payload`,
      },
    });
  return alertas.length;
}

export async function listarAlertasFitosanitarias(
  filtros: { cropId?: string; province?: string; limite?: number } = {},
): Promise<PhytosanitaryAlert[]> {
  const db = obtenerDb();
  const condiciones = [];
  if (filtros.cropId) {
    condiciones.push(eq(alertasFitosanitarias.cropId, filtros.cropId));
  }
  if (filtros.province) {
    condiciones.push(eq(alertasFitosanitarias.province, filtros.province));
  }
  const filas = await db
    .select()
    .from(alertasFitosanitarias)
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(desc(alertasFitosanitarias.publishedAt))
    .limit(filtros.limite ?? 100);
  return filas.map(aDto);
}
