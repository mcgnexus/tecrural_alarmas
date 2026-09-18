import { reglas as reglasPorDefecto } from "@/lib/agronomia/reglas";
import type { Regla } from "@/lib/agronomia/reglas";
import { reglasDesdeConfig } from "@/lib/agronomia/reglas-config";
import { listarReglasRiesgo } from "@/lib/datos/reglas-repo";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("aplicacion.reglas");

/**
 * Carga las reglas activas desde `plataforma.risk_rules`; si no hay ninguna
 * configurada o la BD falla, usa las reglas integradas.
 */
export async function cargarReglasActivas(): Promise<Regla[]> {
  try {
    const filas = await listarReglasRiesgo({ enabled: true });
    const configuradas = reglasDesdeConfig(filas);
    if (configuradas.length > 0) return configuradas;
  } catch (error) {
    log.warn("reglas.carga.error", {}, error);
  }
  return reglasPorDefecto;
}
