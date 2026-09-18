import type {
  RiskContext,
  RiskEvaluation,
  RiskEvaluator,
} from "@/lib/dominio/evaluacion";
import { crearLogger } from "@/lib/log/logger";
import { evaluadorHelada } from "./helada";
import { evaluadorCalor } from "./calor";
import { evaluadorLluvia } from "./lluvia";
import { evaluadorTormenta } from "./tormenta";
import { evaluadorViento } from "./viento";
import { evaluadorDemandaHidrica } from "./demanda-hidrica";
import { evaluadorFitosanitario } from "./fitosanitario";

const log = crearLogger("alertas.motor-evaluadores");

export const EVALUADORES: RiskEvaluator[] = [
  evaluadorHelada,
  evaluadorCalor,
  evaluadorLluvia,
  evaluadorTormenta,
  evaluadorViento,
  evaluadorDemandaHidrica,
  evaluadorFitosanitario,
];

/**
 * Motor de alertas: ejecuta todos los `RiskEvaluator` sobre el contexto y
 * devuelve las evaluaciones de riesgo resultantes.
 */
export async function evaluarRiesgos(
  context: RiskContext,
): Promise<RiskEvaluation[]> {
  const resultados = await Promise.all(
    EVALUADORES.map(async (evaluador) => {
      try {
        return await evaluador.evaluate(context);
      } catch (error) {
        log.warn(
          "evaluador.error",
          { external_source: evaluador.riskType },
          error,
        );
        return null;
      }
    }),
  );
  return resultados.filter((r): r is RiskEvaluation => r !== null);
}

export type { RiskEvaluator };
