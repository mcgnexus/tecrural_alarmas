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

/**
 * Parte una etiqueta de día en las dos líneas del eje de una gráfica.
 * El día de la semana se recorta a dos letras ("Mié 30" -> "Mi 30") porque con
 * dos ejes Y el área de trazado es estrecha y las etiquetas llegaban a tocarse.
 * Las tarjetas usan `etiquetaDia` completa, no esta.
 */
export function lineasEjeDia(valor: string): { linea1: string; linea2: string } {
  const partes = valor.trim().split(/\s+/).filter(Boolean);
  if (partes.length < 2) return { linea1: valor.trim(), linea2: "" };
  const mes = partes.pop() as string;
  const [semana, ...resto] = partes.join(" ").split(" ");
  const semanaCorta = semana.length > 2 ? semana.slice(0, 2) : semana;
  return { linea1: [semanaCorta, ...resto].filter(Boolean).join(" "), linea2: mes };
}

function parte(fecha: Date, opciones: Intl.DateTimeFormatOptions): string {
  return fecha.toLocaleDateString("es-ES", opciones);
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
