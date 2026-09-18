import { evaluarRiesgo } from "@/lib/alertas/motor";
import { guardarEvaluacion, obtenerParcela } from "@/lib/datos/parcelas-repo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import type { ResultadoEvaluacion } from "@/lib/dominio/tipos";
import { cargarReglasActivas } from "./reglas";

/**
 * Orquestación: une el motor de alertas (6) con la persistencia.
 * Ni el motor ni la persistencia se conocen entre sí; esta capa los compone.
 */
export async function evaluarYGuardarParcela(
  id: string,
  dispositivoId: string,
): Promise<ResultadoEvaluacion> {
  const parcela = await obtenerParcela(id);
  if (!parcela) throw new Error("Parcela no encontrada");
  if (parcela.dispositivoId !== dispositivoId) {
    throw new Error("No autorizado");
  }

  const reglasActivas = await cargarReglasActivas();
  const resultado = await evaluarRiesgo(
    {
      latitud: parcela.latitud,
      longitud: parcela.longitud,
      cultivo: parcela.cultivoSlug as CulturaId,
    },
    reglasActivas,
  );

  return guardarEvaluacion(parcela, resultado);
}
