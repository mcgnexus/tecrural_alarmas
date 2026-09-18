import { and, asc, eq } from "drizzle-orm";
import { obtenerDb } from "./db";
import { reglasRiesgo } from "./plataforma-schema";
import type { RiskRule } from "@/lib/dominio/reglas";

type Fila = typeof reglasRiesgo.$inferSelect;

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
