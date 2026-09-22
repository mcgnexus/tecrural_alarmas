import { createHash } from "node:crypto";
import { guardarAvisosOficiales } from "@/lib/datos/alertas-oficiales-repo";
import { guardarAlertasFitosanitarias } from "@/lib/datos/fitosanitario-repo";
import { registrarDocumentoRaif } from "@/lib/datos/raif-documents-repo";
import { registrarIngestaRaif } from "@/lib/datos/raif-ingestions-repo";
import { obtenerDb } from "@/lib/datos/db";
import { cultivos } from "@/lib/datos/plataforma-schema";
import { crearLogger } from "@/lib/log/logger";
import { proveedorRaif } from "@/lib/proveedores/raif";
import { esDominioOficialRaif } from "@/lib/raif/config";
import { descargarYExtraerPdfRaif, extraerRecomendacion } from "@/lib/raif/pdf-extractor";

const log = crearLogger("cron.phytosanitary-refresh");

export interface PhytosanitaryResult {
  fetched: number;
  processed: number;
  saved: number;
  skipped: number;
  failed: number;
}

const MAX_PDF_BYTES = 15 * 1024 * 1024;

/** Hash estable de todos los PDF oficiales del artículo, sin depender del orden RSS. */
async function procesarPdfs(urls: string[]): Promise<{ hash: string | null; extraction: Awaited<ReturnType<typeof descargarYExtraerPdfRaif>> | null }> {
  const hashes: string[] = [];
  let extraction: Awaited<ReturnType<typeof descargarYExtraerPdfRaif>> | null = null;
  for (const url of [...new Set(urls)].sort()) {
    if (!esDominioOficialRaif(url)) continue;
    if (extraction === null) {
      extraction = await descargarYExtraerPdfRaif(url);
      hashes.push(`${url}:${extraction.hash}`);
      continue;
    }
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!respuesta.ok) continue;
    const longitud = Number(respuesta.headers.get("content-length") ?? 0);
    if (longitud > MAX_PDF_BYTES) continue;
    const buffer = await respuesta.arrayBuffer();
    if (buffer.byteLength > MAX_PDF_BYTES) continue;
    hashes.push(`${url}:${createHash("sha256").update(Buffer.from(buffer)).digest("hex")}`);
  }
  if (!hashes.length) return { hash: null, extraction };
  return { hash: createHash("sha256").update(hashes.join("\n")).digest("hex"), extraction };
}

/**
 * Una vez al día: actualizar RAIF.
 */
export async function ejecutarPhytosanitaryRefresh(): Promise<PhytosanitaryResult> {
  if (!proveedorRaif.configurado() || !proveedorRaif.getWarnings) {
    log.info("cron.phytosanitary.skip", { data: { reason: "RAIF no configurado" } });
    return { fetched: 0, processed: 0, saved: 0, skipped: 0, failed: 0 };
  }

  const avisos = await proveedorRaif.getWarnings({ latitud: 37.5, longitud: -2.5 });
  const savedOficial = avisos.length > 0 ? await guardarAvisosOficiales(avisos) : 0;

  // Parche: también puebla phytosanitary_alerts con crop/zona para filtro por cultivo
  let savedFito = 0;
  let processed = 0;
  let failed = 0;
  if (avisos.length > 0) {
    try {
      const db = obtenerDb();
      const mapaCultivo: Record<string, string> = {};
      const filas = await db.select({ id: cultivos.id, slug: cultivos.slug }).from(cultivos);
      for (const r of filas) mapaCultivo[r.slug] = r.id;

      const fitos = (await Promise.all(avisos.map(async (aviso, idx) => {
        try {
        const rico = aviso.rawPayload as {
          cropSlug?: string | null;
          province?: string | null;
          municipality?: string | null;
          region?: string | null;
          coverage?: string | null;
          pestOrDisease?: string | null;
          recommendation?: string | null;
          sourceArticleUrl?: string | null;
          sourcePdfUrl?: string | null;
          sourcePage?: number | null;
          sourceHash?: string | null;
          sourcePublishedAt?: string | null;
          validFrom?: string | null;
          validTo?: string | null;
          extractionVersion?: string | null;
          sourceDocumentId?: string | null;
          severity?: string | null;
          extractionStatus?: string | null;
          extractionConfidence?: number | null;
          evidenceText?: string | null;
        } | undefined;
        const slug = rico?.cropSlug ?? null;
        const cropId = slug ? (mapaCultivo[slug] ?? null) : null;
        const pdfLinks = Array.isArray((rico as { pdfLinks?: unknown } | undefined)?.pdfLinks)
          ? ((rico as { pdfLinks: { url?: unknown }[] }).pdfLinks).map((pdf) => typeof pdf.url === "string" ? pdf.url : "").filter(Boolean)
          : [];
        const pdf = await procesarPdfs(pdfLinks);
        const sourceHash = pdf.hash;
        const documento = await registrarDocumentoRaif({
          provider: aviso.provider,
          rssGuid: aviso.id,
          articleUrl: rico?.sourceArticleUrl ?? aviso.sourceUrl ?? "",
          pdfUrl: pdfLinks[0] ?? null,
          pdfHash: sourceHash,
          publishedAt: rico?.sourcePublishedAt ?? aviso.startsAt ?? null,
        });

        const resultado = {
          provider: aviso.provider,
          externalId: aviso.id ?? `raif-${idx}`,
          cropId,
          title: aviso.headline,
          summary: aviso.description ?? aviso.headline,
          province: rico?.province ?? null,
          municipality: rico?.municipality ?? null,
          severity: rico?.severity ?? null,
          publishedAt: aviso.startsAt ? new Date(aviso.startsAt).toISOString() : new Date().toISOString(),
          sourceUrl: aviso.sourceUrl ?? null,
          sourceArticleUrl: rico?.sourceArticleUrl ?? aviso.sourceUrl ?? null,
          sourcePdfUrl: rico?.sourcePdfUrl ?? null,
          sourceDocumentId: documento.id,
          sourceHash: sourceHash ?? rico?.sourceHash ?? null,
          sourcePage: pdf.extraction?.sourcePage ?? rico?.sourcePage ?? null,
          sourcePublishedAt: rico?.sourcePublishedAt ?? aviso.startsAt ?? null,
          coverage: rico?.coverage ?? null,
          region: rico?.region ?? null,
          pestOrDisease: rico?.pestOrDisease ?? null,
          recommendation: pdf.extraction ? extraerRecomendacion(pdf.extraction.text) : rico?.recommendation ?? null,
          validFrom: rico?.validFrom ?? null,
          validTo: rico?.validTo ?? null,
          extractionVersion: pdf.extraction ? "pdf-native-ocr-v1" : rico?.extractionVersion ?? null,
          extractionStatus: pdf.extraction?.status ?? rico?.extractionStatus ?? "article",
          extractionConfidence: pdf.extraction?.confidence ?? rico?.extractionConfidence ?? null,
          evidenceText: pdf.extraction?.text || rico?.evidenceText || null,
          rawPayload: aviso as unknown as Record<string, unknown>,
        };
        processed += 1;
        return resultado;
        } catch (error) {
          failed += 1;
          log.warn("cron.phytosanitary.item.error", { data: { provider: aviso.provider } }, error);
          return null;
        }
      }))).filter((item): item is NonNullable<typeof item> => item !== null);

      savedFito = await guardarAlertasFitosanitarias(fitos as never);
    } catch (e) {
      log.warn("cron.phytosanitary.fitosanitario.error", {}, e);
    }
  }

  const resultado = { fetched: avisos.length, processed, saved: savedOficial + savedFito, skipped: 0, failed };
  await registrarIngestaRaif(resultado);
  log.info("cron.phytosanitary.ok", { data: resultado });
  return resultado;
}
