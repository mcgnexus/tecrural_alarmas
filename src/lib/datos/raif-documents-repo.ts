import { and, desc, eq } from "drizzle-orm";
import { obtenerDb } from "./db";
import { raifDocuments } from "./plataforma-schema";

export interface RaifDocumentInput {
  provider: string;
  rssGuid: string;
  articleUrl: string;
  pdfUrl?: string | null;
  pdfHash?: string | null;
  publishedAt?: string | null;
}

export interface RaifDocumentResult {
  id: string;
  documentKey: string;
  pdfHash: string | null;
  version: number;
  created: boolean;
}

/** Inserta una versión nueva o actualiza la última observación de la misma. */
export async function registrarDocumentoRaif(input: RaifDocumentInput): Promise<RaifDocumentResult> {
  const db = obtenerDb();
  const hash = input.pdfHash ?? "sin-pdf";
  const documentKey = `${input.provider}:${input.rssGuid}:${hash}`;
  const [existente] = await db
    .select({ id: raifDocuments.id, documentKey: raifDocuments.documentKey, pdfHash: raifDocuments.pdfHash, version: raifDocuments.version })
    .from(raifDocuments)
    .where(eq(raifDocuments.documentKey, documentKey))
    .limit(1);

  if (existente) {
    await db.update(raifDocuments).set({ lastSeenAt: new Date(), pdfUrl: input.pdfUrl ?? null, articleUrl: input.articleUrl }).where(eq(raifDocuments.id, existente.id));
    return { ...existente, pdfHash: existente.pdfHash ?? null, created: false };
  }

  const [anterior] = await db
    .select({ id: raifDocuments.id, version: raifDocuments.version })
    .from(raifDocuments)
    .where(and(eq(raifDocuments.provider, input.provider), eq(raifDocuments.rssGuid, input.rssGuid)))
    .orderBy(desc(raifDocuments.version))
    .limit(1);
  const [creado] = await db.insert(raifDocuments).values({
    provider: input.provider,
    rssGuid: input.rssGuid,
    documentKey,
    articleUrl: input.articleUrl,
    pdfUrl: input.pdfUrl ?? null,
    pdfHash: input.pdfHash ?? null,
    version: (anterior?.version ?? 0) + 1,
    previousDocumentId: anterior?.id ?? null,
    publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
  }).returning({ id: raifDocuments.id, documentKey: raifDocuments.documentKey, pdfHash: raifDocuments.pdfHash, version: raifDocuments.version });
  if (!creado) throw new Error("No se pudo registrar el documento RAIF.");
  return { ...creado, pdfHash: creado.pdfHash ?? null, created: true };
}
