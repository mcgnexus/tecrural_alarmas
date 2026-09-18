import type { HallazgoAgronomico, Severidad } from "@/lib/dominio/tipos";
import type { ContextoAgronomico } from "../contexto";
import type { Regla } from "./regla";

export const reglaHelada: Regla = {
  id: "helada",
  nombre: "Riesgo de helada",
  descripcion:
    "Compara la temperatura mínima prevista con el umbral del cultivo y su fenología.",
  evaluar(ctxar: ContextoAgronomico): HallazgoAgronomico[] {
    const hoy = ctxar.clima.prevision[0];
    if (!hoy) return [];

    const umbral =
      ctxar.fenofase?.sensibleHelada ?? ctxar.cultivo.umbrales.tminHelada;
    const mortal = ctxar.cultivo.umbrales.tminMortal;
    const faseEtiqueta = ctxar.fenofase?.etiqueta ?? "el cultivo en general";

    if (hoy.tMin <= mortal) {
      return [
        {
          regla: "helada",
          tipo: "helada",
          titulo: "Helada con riesgo de daños graves",
          mensaje: `Mínima prevista de ${hoy.tMin} °C para ${faseEtiqueta}; por debajo del umbral crítico (${mortal} °C).`,
          severidad: "critica",
          cultivo: ctxar.cultivo.id,
          fenofase: faseEtiqueta,
          datosUtilizados: ["prevision.tMin", "umbrales.tminMortal"],
          vigenciaHasta: hoy.fecha,
        },
      ];
    }

    if (hoy.tMin <= umbral) {
      const severidad: Severidad = ctxar.fenofase?.sensibleHelada
        ? "alerta"
        : "aviso";
      return [
        {
          regla: "helada",
          tipo: "helada",
          titulo: "Helada probable",
          mensaje: `Mínima prevista de ${hoy.tMin} °C, igual o inferior al umbral de ${umbral} °C para ${faseEtiqueta}.`,
          severidad,
          cultivo: ctxar.cultivo.id,
          fenofase: faseEtiqueta,
          datosUtilizados: ["prevision.tMin", "umbrales.tminHelada"],
          vigenciaHasta: hoy.fecha,
        },
      ];
    }

    return [];
  },
};
