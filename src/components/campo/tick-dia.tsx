type PropsTickDia = {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
};

/**
 * Etiqueta de eje en dos líneas ("Jue 1" / "oct") para que el mes siga siendo
 * legible sin ocupar el ancho de cinco etiquetas largas en móvil.
 * Recharts inyecta x, y y payload mediante cloneElement.
 */
export function TickDia({ x = 0, y = 0, payload }: PropsTickDia) {
  const valor = String(payload?.value ?? "");
  const corte = valor.lastIndexOf(" ");
  const linea1 = corte > 0 ? valor.slice(0, corte) : valor;
  const linea2 = corte > 0 ? valor.slice(corte + 1) : "";
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={11} fill="#44403c">
      <tspan x={x}>{linea1}</tspan>
      {linea2 ? <tspan x={x} dy={12}>{linea2}</tspan> : null}
    </text>
  );
}
