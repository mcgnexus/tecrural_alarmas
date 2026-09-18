import { reglaHelada } from "./helada";
import { reglaGolpeDeCalor } from "./golpe-de-calor";
import { reglaViento } from "./viento";
import { reglaDemandaHidrica } from "./demanda-hidrica";
import type { Regla } from "./regla";

export const reglas: Regla[] = [
  reglaHelada,
  reglaGolpeDeCalor,
  reglaViento,
  reglaDemandaHidrica,
];

export type { Regla };
export { reglaHelada, reglaGolpeDeCalor, reglaViento, reglaDemandaHidrica };