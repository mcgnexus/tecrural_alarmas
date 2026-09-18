import type { HallazgoAgronomico } from "@/lib/dominio/tipos";
import { calcularDemandaHidrica } from "../demanda-hidrica";
import type { ContextoAgronomico } from "../contexto";
import type { Regla } from "./regla";

export const reglaDemandaHidrica: Regla = {
  id: "demanda-hidrica",
  nombre: "Demanda hídrica orientativa",
  descripcion:
    "Estima la evapotranspiración del cultivo y avisa cuando supera el umbral de demanda.",
  evaluar(ctxar: ContextoAgronomico): HallazgoAgronomico[] {
    const hoy = ctxar.clima.prevision[0];
    if (!hoy) return [];

    const factorKc = ctxar.fenofase?.factorKc ?? ctxar.cultivo.factorKc;
    const demanda = calcularDemandaHidrica({
      prevision: ctxar.clima.prevision,
      factorKc,
      momento: ctxar.momento,
    });
    if (demanda.etcMm === 0 || demanda.etcMm < ctxar.cultivo.umbrales.etdUmbralMm) {
      return [];
    }

    const sinLluvia = hoy.probPrecipitacionMax < 30;
    const nota = sinLluvia
      ? " Sin lluvia destacable prevista, vigila la disponibilidad de riego."
      : "";

    return [
      {
        regla: "demanda-hidrica",
        tipo: "demanda-hidrica",
        titulo: "Demanda hídrica alta",
        mensaje: `El cultivo puede demandar unos ${demanda.etcMm} mm/día (ETo ${demanda.etoMm} mm/día × Kc ${demanda.factorKc}). Orientativo; no sustituye a la estación de riego.${nota}`,
        severidad: "info",
        cultivo: ctxar.cultivo.id,
        fenofase: ctxar.fenofase?.etiqueta,
        datosUtilizados: [
          "prevision.tMax",
          "prevision.tMin",
          "prevision.probPrecipitacionMax",
          "fenologia.factorKc",
        ],
        vigenciaHasta: hoy.fecha,
      },
    ];
  },
};
