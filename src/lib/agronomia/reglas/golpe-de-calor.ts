import type { HallazgoAgronomico } from "@/lib/dominio/tipos";
import type { ContextoAgronomico } from "../contexto";
import type { Regla } from "./regla";

export const reglaGolpeDeCalor: Regla = {
  id: "golpe-de-calor",
  nombre: "Golpe de calor",
  descripcion:
    "Avisa cuando la máxima prevista supera el umbral de estrés térmico del cultivo.",
  evaluar(ctxar: ContextoAgronomico): HallazgoAgronomico[] {
    const hoy = ctxar.clima.prevision[0];
    if (!hoy) return [];

    const umbral = ctxar.cultivo.umbrales.tmaxEstres;
    if (hoy.tMax < umbral) return [];
    const faseEtiqueta = ctxar.fenofase?.etiqueta ?? "el cultivo en general";

    return [
      {
        regla: "golpe-de-calor",
        tipo: "golpe-de-calor",
        titulo: "Temperaturas muy altas",
        mensaje: `Máxima prevista de ${hoy.tMax} °C, por encima del umbral de estrés (${umbral} °C) para ${faseEtiqueta}.`,
        severidad: hoy.tMax >= umbral + 4 ? "alerta" : "aviso",
        cultivo: ctxar.cultivo.id,
        fenofase: faseEtiqueta,
        datosUtilizados: ["prevision.tMax", "umbrales.tmaxEstres"],
        vigenciaHasta: hoy.fecha,
      },
    ];
  },
};
