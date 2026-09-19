import type { RiskRule } from "@/lib/dominio/reglas";

function especificidad(
  regla: RiskRule,
  cropId: string | null,
  phenologicalStateId: string | null,
): number {
  let valor = 0;
  if (cropId && regla.cropId === cropId) valor += 1;
  if (phenologicalStateId && regla.phenologicalStateId === phenologicalStateId) {
    valor += 2;
  }
  return valor;
}

function aplica(
  regla: RiskRule,
  cropId: string | null,
  phenologicalStateId: string | null,
): boolean {
  if (regla.cropId && regla.cropId !== cropId) return false;
  if (
    regla.phenologicalStateId &&
    regla.phenologicalStateId !== phenologicalStateId
  ) {
    return false;
  }
  return true;
}

/**
 * Resuelve los parámetros por tipo de riesgo dando prioridad a la regla más
 * específica: estado fenológico > cultivo > global. Empates por `version`.
 */
export function resolverParametrosPorRiesgo(
  reglas: RiskRule[],
  cropId: string | null,
  phenologicalStateId: string | null,
): Record<string, Record<string, unknown>> {
  const porRiesgo = new Map<string, RiskRule>();

  for (const regla of reglas) {
    if (!aplica(regla, cropId, phenologicalStateId)) continue;

    const actual = porRiesgo.get(regla.riskType);
    if (!actual) {
      porRiesgo.set(regla.riskType, regla);
      continue;
    }

    const nuevaEsp = especificidad(regla, cropId, phenologicalStateId);
    const actualEsp = especificidad(actual, cropId, phenologicalStateId);
    if (
      nuevaEsp > actualEsp ||
      (nuevaEsp === actualEsp && regla.version > actual.version)
    ) {
      porRiesgo.set(regla.riskType, regla);
    }
  }

  const salida: Record<string, Record<string, unknown>> = {};
  for (const [riskType, regla] of porRiesgo) {
    salida[riskType] = regla.parameters;
  }
  return salida;
}
