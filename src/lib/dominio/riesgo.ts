export enum RiskLevel {
  GREEN = "GREEN",
  YELLOW = "YELLOW",
  ORANGE = "ORANGE",
  RED = "RED",
  NO_DATA = "NO_DATA",
  // legacy lowercase aliases for compat
  green = "green",
  yellow = "yellow",
  orange = "orange",
  red = "red",
}

export enum RiskType {
  FROST = "FROST",
  HEAT = "HEAT",
  RAIN = "RAIN",
  STORM = "STORM",
  WIND = "WIND",
  WATER_DEMAND = "WATER_DEMAND",
  PHYTOSANITARY = "PHYTOSANITARY",
}

export type RiskLevelString = "green" | "yellow" | "orange" | "red" | "GREEN" | "YELLOW" | "ORANGE" | "RED" | "NO_DATA";
export type RiskLevelLegacy = "green" | "yellow" | "orange" | "red";

export type RiskEventStatus = "open" | "acknowledged" | "closed";

export interface RiskEvent {
  id: string;
  plotId: string;
  riskType: string;
  level: string;
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
  level: string;
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
export function nivelDesdeSeveridad(severidad: string): string {
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
