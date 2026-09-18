import type { HallazgoAgronomico, Severidad } from "@/lib/dominio/tipos";
import type { ContextoAgronomico } from "../contexto";
import type { Regla } from "./regla";

export const reglaViento: Regla = {
  id: "viento",
  nombre: "Viento fuerte",
  descripcion:
    "Avisa cuando la racha máxima prevista supera el umbral crítico del cultivo.",
  evaluar(ctxar: ContextoAgronomico): HallazgoAgronomico[] {
    const hoy = ctxar.clima.prevision[0];
    if (!hoy) return [];

    const umbral = ctxar.cultivo.umbrales.vientoCriticoKmh;
    if (hoy.rachaMaxKmh < umbral) return [];

    const severidad: Severidad =
      hoy.rachaMaxKmh >= umbral * 1.4 ? "alerta" : "aviso";
    const faseEtiqueta = ctxar.fenofase?.etiqueta ?? "el cultivo en general";

    return [
      {
        regla: "viento",
        tipo: "viento",
        titulo: "Rachas de viento intensas",
        mensaje: `Racha máxima prevista de ${hoy.rachaMaxKmh} km/h, por encima del umbral (${umbral} km/h). Riesgo de daños en ${faseEtiqueta}.`,
        severidad,
        cultivo: ctxar.cultivo.id,
        fenofase: faseEtiqueta,
        datosUtilizados: ["prevision.rachaMaxKmh", "umbrales.vientoCriticoKmh"],
        vigenciaHasta: hoy.fecha,
      },
    ];
  },
};
