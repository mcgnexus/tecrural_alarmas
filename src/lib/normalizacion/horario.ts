import type { WeatherHourly } from "@/lib/dominio/proveedores";

/**
 * Hora observada/previsionada más próxima a "ahora" (la anterior o la
 * siguiente, la que esté más cerca). En caso de empate, prefiere la futura.
 */
export function horaMasCercana(horas: WeatherHourly[]): WeatherHourly {
  if (horas.length === 0) throw new Error("Serie horaria vacía");
  const ahora = Date.now();
  const validas = horas.filter((hora) => Number.isFinite(Date.parse(hora.timestamp)));
  if (validas.length === 0) throw new Error("Serie horaria sin timestamps válidos");
  let mejor = validas[0]!;
  let menorDistancia = Math.abs(Date.parse(mejor.timestamp) - ahora);
  for (const hora of validas) {
    const t = Date.parse(hora.timestamp);
    const distancia = Math.abs(t - ahora);
    if (
      distancia < menorDistancia ||
      (distancia === menorDistancia && t > Date.parse(mejor.timestamp))
    ) {
      mejor = hora;
      menorDistancia = distancia;
    }
  }
  return mejor;
}
