import type { CulturaId } from "@/lib/cultivos/catalogo";
import type { ClimaPunto } from "./tipos";
import type { OfficialWarning, WeatherHourly } from "./proveedores";
import type { RiskLevel } from "./riesgo";
import type { PhytosanitaryAlert } from "./fitosanitario";
import type { SensorData } from "./sensores";

// Spec 43: Plot/Crop/Phenology minimal shapes (compatible con plataforma)
export interface Plot {
  id: string;
  latitude: number;
  longitude: number;
  farmId?: string;
  name?: string;
}

export interface Crop {
  id: string;
  slug: string;
  nameEs?: string;
}

export interface PhenologicalState {
  id: string;
  slug: string;
  nameEs?: string;
}

export type SensorSnapshot = SensorData;

export interface CoeficienteCultivo {
  kc: number | null;
  validado: boolean;
  origen: "phenological_state" | "crop" | null;
}

// Spec 43: RiskContext objeto único
export interface RiskContext {
  // Spec 43 canonical
  plot: Plot;
  crop: Crop;
  phenology?: PhenologicalState;
  hourlyForecast: WeatherHourly[];
  recentWeather?: WeatherHourly[];
  officialWarnings: OfficialWarning[];
  phytosanitaryAlerts: PhytosanitaryAlert[];
  sensorData?: SensorSnapshot | null;
  evaluationTime: Date;
  // Sensibilidad agronómica (Fase 4) expuesta para evaluadores
  coldSensitivity?: number | null;
  heatSensitivity?: number | null;
  waterSensitivity?: number | null;
  // Compatibilidad legado
  plotId?: string;
  latitud: number;
  longitud: number;
  clima: ClimaPunto;
  horario?: WeatherHourly[];
  cultivo: CulturaId;
  fenofase: string | null;
  momento: Date;
  parametrosPorRiesgo?: Record<string, Record<string, unknown>>;
  coeficiente?: CoeficienteCultivo;
  avisosFitosanitarios?: PhytosanitaryAlert[];
  avisosOficiales?: OfficialWarning[];
  cropIdPlataforma?: string | null;
}

// Spec 44: RiskFactor y evaluation
export type RiskTypeEval = string;
export type RiskLevelUpper = "GREEN" | "YELLOW" | "ORANGE" | "RED";
export interface RiskFactor {
  name: string;
  value: number | string | null;
  threshold?: number | null;
  unit?: string;
  contribution?: string;
}

export interface RiskEvaluation {
  // Spec 44 canonical (opcionales durante migración, enriquecidos por motor)
  type?: RiskTypeEval;
  level: string;
  score: number | null;
  startsAt: Date;
  endsAt: Date | null;
  headline: string;
  summary: string;
  explanation?: { factors: RiskFactor[] };
  sourceType?: "TECRURAL" | "OFFICIAL" | "MIXED";
  // Compatibilidad legado (deprecated pero mantenido) — opcionales para migración
  riskType: string;
  reason: Record<string, unknown>;
}

export interface RiskEvaluator {
  readonly riskType: string;
  evaluate(context: RiskContext): Promise<RiskEvaluation | null>;
}

// Helpers para migración
export function nivelUpper(level: string): RiskLevelUpper {
  const m: Record<string, RiskLevelUpper> = { "green": "GREEN", "yellow": "YELLOW", "orange": "ORANGE", "red": "RED", "GREEN": "GREEN", "YELLOW": "YELLOW", "ORANGE": "ORANGE", "RED": "RED" };
  return m[String(level)] ?? "GREEN";
}
export function nivelLower(level: string): string {
  const m: Record<string, string> = { "GREEN": "green", "YELLOW": "yellow", "ORANGE": "orange", "RED": "red", "green": "green", "yellow": "yellow", "orange": "orange", "red": "red" };
  return m[String(level)] ?? "green";
}
