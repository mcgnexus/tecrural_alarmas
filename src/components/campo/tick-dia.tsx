import { lineasEjeDia } from "@/lib/ui/fechas";

type PropsTickDia = {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
};

/**
 * Etiqueta de eje en dos líneas ("Mi 30" / "sept") para que el mes siga siendo
 * legible sin ocupar el ancho de cinco etiquetas largas en móvil.
 * Recharts inyecta x, y y payload mediante cloneElement.
 */
export function TickDia({ x = 0, y = 0, payload }: PropsTickDia) {
  const { linea1, linea2 } = lineasEjeDia(String(payload?.value ?? ""));
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={11} fill="#44403c">
      <tspan x={x} dy={6}>{linea1}</tspan>
      {linea2 ? <tspan x={x} dy={13}>{linea2}</tspan> : null}
    </text>
  );
}
