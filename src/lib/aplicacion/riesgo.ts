import { evaluarRiesgo } from "@/lib/alertas/motor";
import type { SolicitudRiesgo } from "@/lib/alertas/motor";
import type { ResultadoEvaluacion } from "@/lib/dominio/tipos";
import { cargarReglasActivas } from "./reglas";

/** Evaluación anónima (sin parcela): carga las reglas configuradas y evalúa. */
export async function evaluarRiesgoAnonimo(
  solicitud: SolicitudRiesgo,
): Promise<ResultadoEvaluacion> {
  const reglasActivas = await cargarReglasActivas();
  return evaluarRiesgo(solicitud, reglasActivas);
}
