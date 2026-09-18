import type { DemandaHidrica, PrevisionDiaria } from "@/lib/dominio/tipos";

export type { DemandaHidrica };

const RA_MENSUAL_MM = [
  8.0, 9.4, 12.1, 14.6, 16.9, 17.6, 17.3, 15.6, 12.8, 10.0, 8.1, 7.1,
];

function hargreavesEto(tMax: number, tMin: number, ra: number): number {
  const tMed = (tMax + tMin) / 2;
  const dif = Math.max(tMax - tMin, 0);
  return 0.0023 * (tMed + 17.8) * Math.sqrt(dif) * ra;
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}

export function calcularDemandaHidrica(ctxar: {
  prevision: PrevisionDiaria[];
  factorKc: number;
  momento: Date;
}): DemandaHidrica {
  const hoy = ctxar.prevision[0];
  const ra = RA_MENSUAL_MM[ctxar.momento.getMonth()] ?? 8;
  const eto = hoy ? hargreavesEto(hoy.tMax, hoy.tMin, ra) : 0;
  return {
    etoMm: redondear(eto),
    etcMm: redondear(eto * ctxar.factorKc),
    factorKc: ctxar.factorKc,
    raMm: ra,
  };
}