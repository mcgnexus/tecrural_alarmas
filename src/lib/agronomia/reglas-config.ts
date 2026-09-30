import type { Cultura } from "@/lib/cultivos/catalogo";
import type { RiskRule } from "@/lib/dominio/reglas";
import { reglas as reglasPorDefecto } from "./reglas";
import type { Regla } from "./reglas/regla";

const POR_CODIGO = new Map(reglasPorDefecto.map((regla) => [regla.id, regla]));

/** Ajusta los umbrales del cultivo según `parameters` de la regla configurada. */
export function ajustarCultivoPorParametros(
  cultivo: Cultura,
  riskType: string,
  parameters: Record<string, unknown> | undefined,
): Cultura {
  const temperatura = parameters?.temperature as
    | { orange?: number; red?: number }
    | undefined;
  const lluvia = parameters?.thresholds as
    | { rain24h?: { yellow?: number; orange?: number; red?: number } }
    | undefined;
  if (!temperatura && !lluvia) return cultivo;

  const umbrales = { ...cultivo.umbrales };
  if (temperatura) {
    if (riskType === "helada") {
      if (typeof temperatura.orange === "number") {
        umbrales.tminHelada = temperatura.orange;
      }
      if (typeof temperatura.red === "number") {
        umbrales.tminMortal = temperatura.red;
      }
    } else if (riskType === "golpe-de-calor") {
      if (typeof temperatura.orange === "number") {
        umbrales.tmaxEstres = temperatura.orange;
      }
    }
  }
  if (lluvia && riskType === "lluvia") {
    const ventana = lluvia.rain24h;
    if (ventana) {
      if (typeof ventana.yellow === "number") {
        umbrales.lluviaAvisoMm = ventana.yellow;
      }
      if (typeof ventana.red === "number") {
        umbrales.lluviaCriticaMm = ventana.red;
      }
    }
  }
  return { ...cultivo, umbrales };
}

/**
 * Convierte reglas configuradas en BD al contrato `Regla`: la lógica vive por
 * `code` (integrada) y los `parameters` ajustan los umbrales, de modo que las
 * reglas no estén completamente codificadas en TypeScript.
 */
export function reglasDesdeConfig(filas: RiskRule[]): Regla[] {
  const salida: Regla[] = [];
  for (const fila of filas) {
    const base = POR_CODIGO.get(fila.code);
    if (!base) continue;
    salida.push({
      id: fila.code,
      nombre: fila.name || base.nombre,
      descripcion: fila.description || base.descripcion,
      evaluar: (ctx) =>
        base.evaluar({
          ...ctx,
          cultivo: ajustarCultivoPorParametros(
            ctx.cultivo,
            fila.riskType,
            fila.parameters,
          ),
        }),
    });
  }
  return salida;
}
