import type {
  RiskContext,
  RiskEvaluation,
  RiskEvaluator,
} from "@/lib/dominio/evaluacion";
import { nivelDesdeSeveridadTexto } from "./comun";

const ORDEN: Record<string, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
  GREEN: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3,
};

export const evaluadorFitosanitario: RiskEvaluator = {
  riskType: "fitosanitario",
  async evaluate(context: RiskContext): Promise<RiskEvaluation | null> {
    let avisos = (context.avisosFitosanitarios ?? []).filter(
      (aviso) =>
        !aviso.cropId ||
        !context.cropIdPlataforma ||
        aviso.cropId === context.cropIdPlataforma,
    );
    // Fallback: si no hay fitosanitarios específicos pero hay avisos oficiales RAIF, usarlos para no perder alerta
    if (avisos.length === 0 && context.avisosOficiales && context.avisosOficiales.length > 0) {
      const raif = context.avisosOficiales.filter((a) => a.provider === "raif");
      if (raif.length > 0) {
        // mapear oficiales a pseudo-fitosanitarios para evaluación
        avisos = raif.map((r) => ({
          id: r.id,
          provider: r.provider,
          externalId: r.id,
          cropId: null,
          title: r.headline,
          summary: r.description ?? r.headline,
          province: null,
          municipality: null,
          severity: r.severity,
          publishedAt: r.startsAt,
          sourceUrl: r.sourceUrl ?? null,
          rawPayload: r as unknown as Record<string, unknown>,
        })) as never;
      }
    }
    if (avisos.length === 0) return null;

    let peor: string = "yellow";
    for (const aviso of avisos) {
      const nivel = nivelDesdeSeveridadTexto(aviso.severity);
      if ((ORDEN[nivel] ?? 0) > (ORDEN[peor] ?? 0)) peor = nivel;
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
