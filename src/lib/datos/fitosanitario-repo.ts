import { and, desc, eq, gte, ilike, lte, max, or, sql } from "drizzle-orm";
import { obtenerDb } from "./db";
import { alertasFitosanitarias, cultivos } from "./plataforma-schema";
import { ultimaIngestaRaif } from "./raif-ingestions-repo";
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
    sourceArticleUrl: fila.sourceArticleUrl,
    sourcePdfUrl: fila.sourcePdfUrl,
    sourceDocumentId: fila.sourceDocumentId,
    sourceHash: fila.sourceHash,
    sourcePage: fila.sourcePage,
    sourcePublishedAt: fila.sourcePublishedAt?.toISOString() ?? null,
    coverage: fila.coverage,
    region: fila.region,
    pestOrDisease: fila.pestOrDisease,
    recommendation: fila.recommendation,
    validFrom: fila.validFrom?.toISOString() ?? null,
    validTo: fila.validTo?.toISOString() ?? null,
    extractionVersion: fila.extractionVersion,
    extractionStatus: fila.extractionStatus,
    extractionConfidence: fila.extractionConfidence,
    evidenceText: fila.evidenceText,
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
        sourceArticleUrl: alerta.sourceArticleUrl ?? alerta.sourceUrl ?? null,
        sourcePdfUrl: alerta.sourcePdfUrl ?? null,
        sourceDocumentId: alerta.sourceDocumentId ?? null,
        sourceHash: alerta.sourceHash ?? null,
        sourcePage: alerta.sourcePage ?? null,
        sourcePublishedAt: alerta.sourcePublishedAt ? new Date(alerta.sourcePublishedAt) : null,
        coverage: alerta.coverage ?? null,
        region: alerta.region ?? null,
        pestOrDisease: alerta.pestOrDisease ?? null,
        recommendation: alerta.recommendation ?? null,
        validFrom: alerta.validFrom ? new Date(alerta.validFrom) : null,
        validTo: alerta.validTo ? new Date(alerta.validTo) : null,
        extractionVersion: alerta.extractionVersion ?? null,
        extractionStatus: alerta.extractionStatus ?? "article",
        extractionConfidence: alerta.extractionConfidence ?? null,
        evidenceText: alerta.evidenceText ?? null,
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
        sourceArticleUrl: sql`excluded.source_article_url`,
        sourcePdfUrl: sql`excluded.source_pdf_url`,
        sourceDocumentId: sql`excluded.source_document_id`,
        sourceHash: sql`excluded.source_hash`,
        sourcePage: sql`excluded.source_page`,
        sourcePublishedAt: sql`excluded.source_published_at`,
        coverage: sql`excluded.coverage`,
        region: sql`excluded.region`,
        pestOrDisease: sql`excluded.pest_or_disease`,
        recommendation: sql`excluded.recommendation`,
        validFrom: sql`excluded.valid_from`,
        validTo: sql`excluded.valid_to`,
        extractionVersion: sql`excluded.extraction_version`,
        extractionStatus: sql`excluded.extraction_status`,
        extractionConfidence: sql`excluded.extraction_confidence`,
        evidenceText: sql`excluded.evidence_text`,
        updatedAt: sql`now()`,
        rawPayload: sql`excluded.raw_payload`,
      },
    });
  return alertas.length;
}

export async function listarAlertasFitosanitarias(
  filtros: { cropId?: string; province?: string; municipality?: string; region?: string; pest?: string; from?: string; to?: string; limite?: number } = {},
): Promise<PhytosanitaryAlert[]> {
  const db = obtenerDb();
  const condiciones = [];
  if (filtros.cropId) {
    const [cultivo] = await db.select({ id: cultivos.id }).from(cultivos).where(eq(cultivos.slug, filtros.cropId)).limit(1);
    condiciones.push(eq(alertasFitosanitarias.cropId, cultivo?.id ?? filtros.cropId));
  }
  if (filtros.province) {
    condiciones.push(ilike(alertasFitosanitarias.province, filtros.province));
  }
  if (filtros.municipality) condiciones.push(ilike(alertasFitosanitarias.municipality, filtros.municipality));
  if (filtros.region) condiciones.push(ilike(alertasFitosanitarias.region, filtros.region));
  if (filtros.pest) condiciones.push(or(ilike(alertasFitosanitarias.pestOrDisease, `%${filtros.pest}%`), ilike(alertasFitosanitarias.title, `%${filtros.pest}%`))!);
  if (filtros.from) condiciones.push(gte(alertasFitosanitarias.publishedAt, new Date(filtros.from)));
  if (filtros.to) condiciones.push(lte(alertasFitosanitarias.publishedAt, new Date(filtros.to)));
  const filas = await db
    .select()
    .from(alertasFitosanitarias)
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(desc(alertasFitosanitarias.publishedAt))
    .limit(filtros.limite ?? 100);
  return filas.map(aDto);
}

export async function metadatosFitosanitarios(): Promise<{ ultimaIngesta: string | null; boletinMasReciente: string | null }> {
  const db = obtenerDb();
  const [fila] = await db.select({ boletinMasReciente: max(alertasFitosanitarias.publishedAt) }).from(alertasFitosanitarias);
  return {
    ultimaIngesta: await ultimaIngestaRaif(),
    boletinMasReciente: fila?.boletinMasReciente?.toISOString() ?? null,
  };
}
