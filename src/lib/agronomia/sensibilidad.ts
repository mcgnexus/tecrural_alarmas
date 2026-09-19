import type { RiskLevel } from "@/lib/dominio/riesgo";

const ORDEN: Record<string, number> = { green: 0, yellow: 1, orange: 2, red: 3, GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 };
const NIVELES = ["green", "yellow", "orange", "red"] as const;

export function sensibilidadACadena(valor: unknown, porDefecto = 1): number {
  const n = typeof valor === "string" ? Number(valor) : (valor as number);
  return Number.isFinite(n) ? n : porDefecto;
}

/**
 * Encapsula fórmula Fase 4: riesgo_meteo × sensibilidad_cultivo/fenología
 * Si sensibilidad >1.2 escala un nivel, si <0.8 desescala, si ~1 mantiene.
 * También ajusta score proporcionalmente.
 */
export function aplicarSensibilidad(
  nivelMeteo: string | null,
  scoreMeteo: number | null,
  sensibilidad: number,
): { nivel: string | null; score: number | null } {
  if (!nivelMeteo) return { nivel: null, score: scoreMeteo };
  const idx = ORDEN[nivelMeteo] ?? 0;
  let nuevoIdx = idx;
  if (sensibilidad >= 1.5 && idx < 3) nuevoIdx = Math.min(3, idx + 1);
  else if (sensibilidad >= 1.2 && idx < 3) nuevoIdx = idx + 1;
  else if (sensibilidad <= 0.6 && idx > 0) nuevoIdx = Math.max(0, idx - 1);
  else if (sensibilidad <= 0.8 && idx > 0) nuevoIdx = Math.max(0, idx - 1);

  const nivel = NIVELES[nuevoIdx] ?? nivelMeteo;
  const score = scoreMeteo !== null ? Math.round(scoreMeteo * sensibilidad * 10) / 10 : null;
  return { nivel, score };
}

export function sensibilidadDeContexto(ctx: { coldSensitivity?: unknown; heatSensitivity?: unknown; waterSensitivity?: unknown }, tipo: string): number {
  if (tipo === "helada") return sensibilidadACadena(ctx.coldSensitivity, 1);
  if (tipo === "golpe-de-calor" || tipo === "calor") return sensibilidadACadena(ctx.heatSensitivity, 1);
  if (tipo === "demanda-hidrica") return sensibilidadACadena(ctx.waterSensitivity, 1);
  if (tipo === "viento") return sensibilidadACadena(ctx.heatSensitivity ?? ctx.coldSensitivity, 1);
  return 1;
}
