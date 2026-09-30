import type { HallazgoAgronomico, Severidad } from "@/lib/dominio/tipos";
import type { ContextoAgronomico } from "../contexto";
import type { Regla } from "./regla";

/**
 * Riesgo de lluvia intensa. Compara la precipitación acumulada prevista para el
 * día con los umbrales del cultivo. La probabilidad solo modula la severidad:
 * nunca dispara una alerta por sí sola.
 */
export const reglaLluvia: Regla = {
  id: "lluvia",
  nombre: "Lluvia intensa",
  descripcion:
    "Compara la precipitación acumulada prevista con el umbral del cultivo y su fenología.",
  evaluar(ctxar: ContextoAgronomico): HallazgoAgronomico[] {
    const hoy = ctxar.clima.prevision[0];
    if (!hoy) return [];

    const { lluviaAvisoMm: aviso, lluviaCriticaMm: critica } =
      ctxar.cultivo.umbrales;
    const acumulado = hoy.precipitacionTotal;
    if (acumulado < aviso) return [];

    const faseEtiqueta = ctxar.fenofase?.etiqueta ?? "el cultivo en general";

    const severidad: Severidad = acumulado >= critica ? "alerta" : "aviso";

    const riesgoEncharcamiento =
      severidad === "alerta"
        ? " Riesgo de encharcamiento, charcos en caminos y desprendimiento de frutos."
        : "";

    return [
      {
        regla: "lluvia",
        tipo: "lluvia",
        titulo: "Lluvia intensa prevista",
        mensaje: `Se prevén ${acumulado} mm acumulados con una probabilidad máxima del ${hoy.probPrecipitacionMax} % para ${faseEtiqueta}; por encima del umbral de aviso (${aviso} mm).${riesgoEncharcamiento}`,
        severidad,
        cultivo: ctxar.cultivo.id,
        fenofase: faseEtiqueta,
        datosUtilizados: [
          "prevision.precipitacionTotal",
          "prevision.probPrecipitacionMax",
          "umbrales.lluviaAvisoMm",
        ],
        vigenciaHasta: hoy.fecha,
      },
    ];
  },
};
