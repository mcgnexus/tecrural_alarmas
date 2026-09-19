import { isNotNull } from "drizzle-orm";
import { evaluarPlotPlataforma } from "@/lib/aplicacion/riesgo-plataforma";
import { obtenerDb } from "@/lib/datos/db";
import { parcelasPlataforma } from "@/lib/datos/plataforma-schema";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("cron.water-demand");

export interface WaterDemandResult {
  total: number;
  evaluated: number;
  withDemand: number;
  errors: number;
}

/**
 * Una vez al día: calcular ET0 acumulada, precipitación y demanda hídrica.
 * Reutiliza el evaluador de demanda hídrica dentro de evaluarPlotPlataforma
 * (ET0 7d - lluvia efectiva 7d + modificador por calor).
 */
export async function ejecutarWaterDemandUpdate(opciones: { limit?: number } = {}): Promise<WaterDemandResult> {
  const db = obtenerDb();
  const filas = await db
    .select({ id: parcelasPlataforma.id })
    .from(parcelasPlataforma)
    .where(isNotNull(parcelasPlataforma.latitude))
    .limit(opciones.limit ?? 200);

  let evaluated = 0;
  let withDemand = 0;
  let errors = 0;

  for (const { id } of filas) {
    try {
      const res = await evaluarPlotPlataforma(id);
      evaluated += 1;
      const demanda = res.eventos.find((e) => e.riskType === "demanda-hidrica");
      if (demanda) withDemand += 1;
    } catch (e) {
      errors += 1;
      log.warn("cron.water-demand.item.error", { plot_id: id }, e);
    }
  }

  log.info("cron.water-demand.ok", { data: { total: filas.length, evaluated, withDemand, errors } });
  return { total: filas.length, evaluated, withDemand, errors };
}
