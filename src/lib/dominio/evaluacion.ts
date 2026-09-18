import type { CulturaId } from "@/lib/cultivos/catalogo";
import type { ClimaPunto } from "./tipos";
import type { OfficialWarning, WeatherHourly } from "./proveedores";
import type { RiskLevel } from "./riesgo";
import type { PhytosanitaryAlert } from "./fitosanitario";

export interface RiskContext {
  plotId?: string;
  latitud: number;
  longitud: number;
  clima: ClimaPunto;
  /** Serie horaria normalizada (temperatura, rocío, viento, nubosidad…). */
  horario?: WeatherHourly[];
  cultivo: CulturaId;
  fenofase: string | null;
  momento: Date;
  /** Parámetros configurables por tipo de riesgo (`risk_rules.parameters`). */
  parametrosPorRiesgo?: Record<string, Record<string, unknown>>;
  avisosFitosanitarios?: PhytosanitaryAlert[];
  /** Avisos oficiales (AEMET meteorológicos) con prioridad absoluta. */
  avisosOficiales?: OfficialWarning[];
  cropIdPlataforma?: string | null;
}

export interface RiskEvaluation {
  riskType: string;
  level: RiskLevel;
  score: number | null;
  headline: string;
  summary: string;
  reason: Record<string, unknown>;
  startsAt: Date;
  endsAt: Date | null;
}

export interface RiskEvaluator {
  readonly riskType: string;
  evaluate(context: RiskContext): Promise<RiskEvaluation | null>;
}
