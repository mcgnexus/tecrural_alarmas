import { and, asc, eq } from "drizzle-orm";
import { obtenerDb } from "./db";
import { reglasRiesgo } from "./plataforma-schema";
import type { RiskRule } from "@/lib/dominio/reglas";

type Fila = typeof reglasRiesgo.$inferSelect;

export interface ReglaRiesgoInput {
  code: string;
  riskType: string;
  name: string;
  description?: string;
  cropId?: string | null;
  phenologicalStateId?: string | null;
  parameters?: Record<string, unknown>;
  enabled?: boolean;
  version?: number;
}

function aDto(fila: Fila): RiskRule {
  return {
    id: fila.id,
    code: fila.code,
    riskType: fila.riskType,
    name: fila.name,
    description: fila.description,
    cropId: fila.cropId,
    phenologicalStateId: fila.phenologicalStateId,
    parameters: fila.parameters,
    enabled: fila.enabled,
    version: fila.version,
  };
}

export async function listarReglasRiesgo(
  filtros: { enabled?: boolean; riskType?: string; cropId?: string } = {},
): Promise<RiskRule[]> {
  const db = obtenerDb();
  const condiciones = [];
  if (filtros.enabled !== undefined) {
    condiciones.push(eq(reglasRiesgo.enabled, filtros.enabled));
  }
  if (filtros.riskType) {
    condiciones.push(eq(reglasRiesgo.riskType, filtros.riskType));
  }
  if (filtros.cropId) {
    condiciones.push(eq(reglasRiesgo.cropId, filtros.cropId));
  }
  const filas = await db
    .select()
    .from(reglasRiesgo)
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(asc(reglasRiesgo.code));
  return filas.map(aDto);
}

export async function obtenerReglaPorCodigo(
  code: string,
): Promise<RiskRule | null> {
  const db = obtenerDb();
  const [fila] = await db
    .select()
    .from(reglasRiesgo)
    .where(eq(reglasRiesgo.code, code))
    .limit(1);
  return fila ? aDto(fila) : null;
}

export async function obtenerReglaPorId(id: string): Promise<RiskRule | null> {
  const db = obtenerDb();
  const [fila] = await db
    .select()
    .from(reglasRiesgo)
    .where(eq(reglasRiesgo.id, id))
    .limit(1);
  return fila ? aDto(fila) : null;
}

export async function crearReglaRiesgo(
  input: ReglaRiesgoInput,
): Promise<RiskRule> {
  const db = obtenerDb();
  const [fila] = await db
    .insert(reglasRiesgo)
    .values({
      code: input.code,
      riskType: input.riskType,
      name: input.name,
      description: input.description ?? "",
      cropId: input.cropId ?? null,
      phenologicalStateId: input.phenologicalStateId ?? null,
      parameters: input.parameters ?? {},
      enabled: input.enabled ?? true,
      version: input.version ?? 1,
    })
    .returning();
  if (!fila) throw new Error("No se pudo crear la regla.");
  return aDto(fila);
}

export async function actualizarReglaRiesgo(
  id: string,
  cambios: Partial<ReglaRiesgoInput>,
): Promise<RiskRule | null> {
  const db = obtenerDb();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (cambios.code !== undefined) set.code = cambios.code;
  if (cambios.riskType !== undefined) set.riskType = cambios.riskType;
  if (cambios.name !== undefined) set.name = cambios.name;
  if (cambios.description !== undefined) set.description = cambios.description;
  if (cambios.cropId !== undefined) set.cropId = cambios.cropId;
  if (cambios.phenologicalStateId !== undefined) {
    set.phenologicalStateId = cambios.phenologicalStateId;
  }
  if (cambios.parameters !== undefined) set.parameters = cambios.parameters;
  if (cambios.enabled !== undefined) set.enabled = cambios.enabled;
  if (cambios.version !== undefined) set.version = cambios.version;

  const [fila] = await db
    .update(reglasRiesgo)
    .set(set)
    .where(eq(reglasRiesgo.id, id))
    .returning();
  return fila ? aDto(fila) : null;
}

export async function eliminarReglaRiesgo(id: string): Promise<boolean> {
  const db = obtenerDb();
  const borradas = await db
    .delete(reglasRiesgo)
    .where(eq(reglasRiesgo.id, id))
    .returning({ id: reglasRiesgo.id });
  return borradas.length > 0;
}
