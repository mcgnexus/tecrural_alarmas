import { RANGOS_LEAD } from "@/lib/dominio/lead-scores";

/**
 * Expresión `CASE` SQL que clasifica una columna numérica de score con los
 * rangos comerciales canónicos (`RANGOS_LEAD`). `columna` debe ser una
 * referencia controlada (p. ej. `l.score`), nunca entrada del usuario.
 */
export function sqlClasificarLead(columna: string): string {
  const ramas = RANGOS_LEAD.map((rango) =>
    Number.isFinite(rango.hasta)
      ? `WHEN ${columna} <= ${rango.hasta} THEN '${rango.clasificacion}'`
      : `ELSE '${rango.clasificacion}'`,
  );
  return `CASE ${ramas.join(" ")} END`;
}
