export type RiskLevel = "green" | "yellow" | "orange" | "red";

export type RiskEventStatus = "open" | "acknowledged" | "closed";

export interface RiskEvent {
  id: string;
  plotId: string;
  riskType: string;
  level: RiskLevel;
  score: number | null;
  startsAt: string;
  endsAt: string | null;
  headline: string;
  summary: string;
  reason: Record<string, unknown>;
  ruleVersion: number;
  weatherLocationId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface NuevoRiskEvent {
  plotId: string;
  riskType: string;
  level: RiskLevel;
  score: number | null;
  startsAt: Date;
  endsAt: Date | null;
  headline: string;
  summary: string;
  reason: Record<string, unknown>;
  ruleVersion: number;
  weatherLocationId: string | null;
  status: string;
}

/** Traduce la severidad interna de una alerta al nivel de riesgo. */
export function nivelDesdeSeveridad(severidad: string): RiskLevel {
  switch (severidad) {
    case "critica":
      return "red";
    case "alerta":
      return "orange";
    case "aviso":
      return "yellow";
    default:
      return "green";
  }
}
