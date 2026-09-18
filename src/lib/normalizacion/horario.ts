import type { WeatherHourly } from "@/lib/dominio/proveedores";

/** Hora de la serie más próxima al instante actual. */
export function horaMasCercana(horas: WeatherHourly[]): WeatherHourly {
  if (horas.length === 0) throw new Error("Serie horaria vacía");
  const ahora = Date.now();
  let mejor = horas[0]!;
  let menorDistancia = Math.abs(new Date(mejor.timestamp).getTime() - ahora);
  for (const hora of horas) {
    const distancia = Math.abs(new Date(hora.timestamp).getTime() - ahora);
    if (distancia < menorDistancia) {
      mejor = hora;
      menorDistancia = distancia;
    }
  }
  return mejor;
}
