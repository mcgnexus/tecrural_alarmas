/**
 * Etiquetas de día para tarjetas y gráficas.
 * Incluyen el mes porque una previsión de 5 días suele cruzar de mes: sin él,
 * "Vie 01" y "Vie 01" de meses distintos son indistinguibles de un vistazo.
 *
 * Se componen por partes en lugar de usar un único `toLocaleDateString` porque
 * en es-ES ese formato introduce una coma ("jue, 1 oct").
 */
export function etiquetaDia(fecha: Date): string {
  return `${capitalizar(parte(fecha, { weekday: "short" }))} ${parte(fecha, { day: "numeric" })} ${parte(fecha, { month: "short" })}`;
}

function parte(fecha: Date, opciones: Intl.DateTimeFormatOptions): string {
  return fecha.toLocaleDateString("es-ES", opciones);
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
