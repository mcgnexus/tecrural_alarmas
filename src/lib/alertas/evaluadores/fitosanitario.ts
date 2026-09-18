import type {
  RiskContext,
  RiskEvaluation,
  RiskEvaluator,
} from "@/lib/dominio/evaluacion";
import type { RiskLevel } from "@/lib/dominio/riesgo";
import { nivelDesdeSeveridadTexto } from "./comun";

const ORDEN: Record<RiskLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

export const evaluadorFitosanitario: RiskEvaluator = {
  riskType: "fitosanitario",
  async evaluate(context: RiskContext): Promise<RiskEvaluation | null> {
    const avisos = (context.avisosFitosanitarios ?? []).filter(
      (aviso) =>
        !aviso.cropId ||
        !context.cropIdPlataforma ||
        aviso.cropId === context.cropIdPlataforma,
    );
    if (avisos.length === 0) return null;

    let peor: RiskLevel = "yellow";
    for (const aviso of avisos) {
      const nivel = nivelDesdeSeveridadTexto(aviso.severity);
      if (ORDEN[nivel] > ORDEN[peor]) peor = nivel;
    }

    const primero = avisos[0]!;
    return {
      riskType: "fitosanitario",
      level: peor,
      score: null,
      headline: primero.title,
      summary: primero.summary,
      reason: {
        proveedor: primero.provider,
        provincia: primero.province,
        municipio: primero.municipality,
        total: avisos.length,
        publicados: avisos.map((aviso) => aviso.publishedAt),
      },
      startsAt: context.momento,
      endsAt: null,
    };
  },
};
