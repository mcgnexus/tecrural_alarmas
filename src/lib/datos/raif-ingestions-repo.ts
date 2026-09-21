import { desc, eq } from "drizzle-orm";
import { obtenerDb } from "./db";
import { raifIngestions } from "./plataforma-schema";

export interface RaifIngestionResult {
  fetched: number;
  processed: number;
  saved: number;
  skipped: number;
  failed: number;
}

export async function registrarIngestaRaif(resultado: RaifIngestionResult): Promise<void> {
  const db = obtenerDb();
  await db.insert(raifIngestions).values({
    status: "ok",
    completedAt: new Date(),
    fetched: resultado.fetched,
    processed: resultado.processed,
    saved: resultado.saved,
    skipped: resultado.skipped,
    failed: resultado.failed,
  });
}

export async function ultimaIngestaRaif(): Promise<string | null> {
  const db = obtenerDb();
  const [fila] = await db.select({ completedAt: raifIngestions.completedAt }).from(raifIngestions).where(eq(raifIngestions.status, "ok")).orderBy(desc(raifIngestions.completedAt)).limit(1);
  return fila?.completedAt?.toISOString() ?? null;
}
