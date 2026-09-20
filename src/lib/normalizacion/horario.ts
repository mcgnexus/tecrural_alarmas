import type { WeatherHourly } from "@/lib/dominio/proveedores";

/** Hora observada/previsionada más próxima, priorizando la hora actual o futura. */
export function horaMasCercana(horas: WeatherHourly[]): WeatherHourly {
  if (horas.length === 0) throw new Error("Serie horaria vacía");
  const ahora = Date.now();
  const validas = horas.filter((hora) => Number.isFinite(Date.parse(hora.timestamp)));
  if (validas.length === 0) throw new Error("Serie horaria sin timestamps válidos");
  const futuras = validas.filter((hora) => Date.parse(hora.timestamp) >= ahora);
  const candidatas = futuras.length > 0 ? futuras : validas;
  let mejor = candidatas[0]!;
  let menorDistancia = Math.abs(Date.parse(mejor.timestamp) - ahora);
  for (const hora of candidatas) {
    const distancia = Math.abs(Date.parse(hora.timestamp) - ahora);
    if (distancia < menorDistancia) {
      mejor = hora;
      menorDistancia = distancia;
    }
  }
  return mejor;
}
