export function haceMinutos(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "Actualizado hace menos de 1 min";
  if (mins === 1) return "Actualizado hace 1 min";
  if (mins < 60) return `Actualizado hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas === 1) return "Actualizado hace 1 h";
  return `Actualizado hace ${horas} h`;
}

export function esDatosCaducados(fecha: string | Date, maxMin = 60): boolean {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const diffMin = (Date.now() - d.getTime()) / 60000;
  return diffMin > maxMin;
}
