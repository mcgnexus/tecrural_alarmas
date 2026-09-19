import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import { ajustarCultivoPorParametros } from "@/lib/agronomia/reglas-config";
import type { ContextoAgronomico } from "@/lib/agronomia/contexto";
import type { RiskContext, RiskEvaluation } from "@/lib/dominio/evaluacion";
import type { HallazgoAgronomico } from "@/lib/dominio/tipos";
import { nivelDesdeSeveridad } from "@/lib/dominio/riesgo";
import type { RiskLevel } from "@/lib/dominio/riesgo";

export function contextoAgronomico(
  context: RiskContext,
  riskType: string,
): ContextoAgronomico {
  const base = catalogoCultivos[context.cultivo];
  const parametros = context.parametrosPorRiesgo?.[riskType];
  const cultivo = ajustarCultivoPorParametros(base, riskType, parametros);
  const fenofase = context.fenofase
    ? (cultivo.fenologia.find((f) => f.etiqueta === context.fenofase) ?? null)
    : null;
  return { clima: context.clima, cultivo, fenofase, momento: context.momento };
}

export function aEvaluacion(
  hallazgo: HallazgoAgronomico,
  context: RiskContext,
  riskType: string,
): RiskEvaluation {
  return {
    riskType,
    level: nivelDesdeSeveridad(hallazgo.severidad),
    score: null,
    headline: hallazgo.titulo,
    summary: hallazgo.mensaje,
    reason: {
      regla: hallazgo.regla,
      severidad: hallazgo.severidad,
      datosUtilizados: hallazgo.datosUtilizados,
      cultivo: context.cultivo,
      fenofase: hallazgo.fenofase ?? context.fenofase,
      fuente: context.clima.fuente.id,
    },
    startsAt: context.momento,
    endsAt: hallazgo.vigenciaHasta ? new Date(hallazgo.vigenciaHasta) : null,
  };
}

export function numeroParametro(valor: unknown, porDefecto: number): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : porDefecto;
}

export function nivelDesdeSeveridadTexto(
  severidad: string | null | undefined,
): string {
  const s = (severidad ?? "").toLowerCase();
  if (
    s.includes("extreme") ||
    s.includes("severe") ||
    s.includes("rojo") ||
    s.includes("red") ||
    s.includes("alta") ||
    s.includes("high") ||
    s.includes("critica")
  ) {
    return "red";
  }
  if (
    s.includes("moderate") ||
    s.includes("naranja") ||
    s.includes("orange") ||
    s.includes("media") ||
    s.includes("medium")
  ) {
    return "orange";
  }
  if (s.includes("green") || s.includes("verde")) return "green";
  return "yellow";
}
