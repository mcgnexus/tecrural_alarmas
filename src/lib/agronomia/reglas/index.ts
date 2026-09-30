import { reglaHelada } from "./helada";
import { reglaGolpeDeCalor } from "./golpe-de-calor";
import { reglaViento } from "./viento";
import { reglaLluvia } from "./lluvia";
import { reglaDemandaHidrica } from "./demanda-hidrica";
import type { Regla } from "./regla";

export const reglas: Regla[] = [
  reglaHelada,
  reglaGolpeDeCalor,
  reglaViento,
  reglaLluvia,
  reglaDemandaHidrica,
];

export type { Regla };
export {
  reglaHelada,
  reglaGolpeDeCalor,
  reglaViento,
  reglaLluvia,
  reglaDemandaHidrica,
};
