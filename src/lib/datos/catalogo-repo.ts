import { and, asc, eq } from "drizzle-orm";
import { obtenerDb } from "./db";
import { cultivos, estadosFenologicos } from "./plataforma-schema";

export interface CultivoPlataforma {
  id: string;
  slug: string;
  nameEs: string;
  kc: number | null;
  kcValidated: boolean;
}

export interface EstadoFenologico {
  id: string;
  cropId: string;
  slug: string;
  nameEs: string;
  orderIndex: number;
  kc: number | null;
  kcValidated: boolean;
}

function aNumero(valor: string | number | null): number | null {
  if (valor === null) return null;
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export async function listarCultivosPlataforma(): Promise<CultivoPlataforma[]> {
  const db = obtenerDb();
  const filas = await db
    .select({
      id: cultivos.id,
      slug: cultivos.slug,
      nameEs: cultivos.nameEs,
      kc: cultivos.kc,
      kcValidated: cultivos.kcValidated,
    })
    .from(cultivos)
    .orderBy(asc(cultivos.slug));
  return filas.map((f) => ({ ...f, kc: aNumero(f.kc) }));
}

export async function actualizarKcCultivo(
  cropId: string,
  cambios: { kc?: number | null; kcValidated?: boolean },
): Promise<CultivoPlataforma | null> {
  const db = obtenerDb();
  const set: Record<string, unknown> = {};
  if (cambios.kc !== undefined) set.kc = cambios.kc;
  if (cambios.kcValidated !== undefined) set.kcValidated = cambios.kcValidated;
  if (Object.keys(set).length === 0) {
    const [actual] = await listarCultivosPlataforma();
    return actual ?? null;
  }
  const [fila] = await db
    .update(cultivos)
    .set(set)
    .where(eq(cultivos.id, cropId))
    .returning({
      id: cultivos.id,
      slug: cultivos.slug,
      nameEs: cultivos.nameEs,
      kc: cultivos.kc,
      kcValidated: cultivos.kcValidated,
    });
  if (!fila) return null;
  return { ...fila, kc: aNumero(fila.kc) };
}

export async function listarEstadosFenologicos(filtros: {
  cropId?: string;
} = {}): Promise<EstadoFenologico[]> {
  const db = obtenerDb();
  const filas = await db
    .select()
    .from(estadosFenologicos)
    .where(
      filtros.cropId ? eq(estadosFenologicos.cropId, filtros.cropId) : undefined,
    )
    .orderBy(asc(estadosFenologicos.cropId), asc(estadosFenologicos.orderIndex));
  return filas.map((f) => ({
    id: f.id,
    cropId: f.cropId,
    slug: f.slug,
    nameEs: f.nameEs,
    orderIndex: f.orderIndex,
    kc: aNumero(f.kc),
    kcValidated: f.kcValidated,
  }));
}

export async function actualizarKcEstado(
  id: string,
  cambios: { kc?: number | null; kcValidated?: boolean },
): Promise<EstadoFenologico | null> {
  const db = obtenerDb();
  const set: Record<string, unknown> = {};
  if (cambios.kc !== undefined) {
    set.kc = cambios.kc === null ? null : String(cambios.kc);
  }
  if (cambios.kcValidated !== undefined) set.kcValidated = cambios.kcValidated;
  if (Object.keys(set).length === 0) return null;

  const [fila] = await db
    .update(estadosFenologicos)
    .set(set)
    .where(eq(estadosFenologicos.id, id))
    .returning();
  if (!fila) return null;
  return {
    id: fila.id,
    cropId: fila.cropId,
    slug: fila.slug,
    nameEs: fila.nameEs,
    orderIndex: fila.orderIndex,
    kc: aNumero(fila.kc),
    kcValidated: fila.kcValidated,
  };
}

/**
 * Inserta o actualiza un estado fenológico. Si ya existe y su Kc está validado,
 * NO se sobrescribe el Kc (solo el nombre/orden).
 */
export async function upsertEstadoFenologico(input: {
  cropId: string;
  slug: string;
  nameEs: string;
  orderIndex: number;
  kc: number | null;
  kcValidated?: boolean;
}): Promise<string> {
  const db = obtenerDb();
  const [existente] = await db
    .select()
    .from(estadosFenologicos)
    .where(
      and(
        eq(estadosFenologicos.cropId, input.cropId),
        eq(estadosFenologicos.slug, input.slug),
      ),
    )
    .limit(1);

  if (existente) {
    const set = existente.kcValidated
      ? { nameEs: input.nameEs, orderIndex: input.orderIndex, active: true }
      : {
          nameEs: input.nameEs,
          orderIndex: input.orderIndex,
          kc: input.kc === null ? null : String(input.kc),
          active: true,
        };
    await db
      .update(estadosFenologicos)
      .set(set)
      .where(eq(estadosFenologicos.id, existente.id));
    return existente.id;
  }

  const [creado] = await db
    .insert(estadosFenologicos)
    .values({
      cropId: input.cropId,
      slug: input.slug,
      nameEs: input.nameEs,
      orderIndex: input.orderIndex,
      kc: input.kc === null ? null : String(input.kc),
      kcValidated: input.kcValidated ?? false,
    })
    .returning({ id: estadosFenologicos.id });
  if (!creado) throw new Error("No se pudo crear el estado fenológico.");
  return creado.id;
}
