export type RiskType =
  | "helada"
  | "golpe-de-calor"
  | "viento"
  | "demanda-hidrica";

export interface RiskRule {
  id: string;
  code: string;
  riskType: string;
  name: string;
  description: string;
  cropId: string | null;
  phenologicalStateId: string | null;
  parameters: Record<string, unknown>;
  enabled: boolean;
  version: number;
}
