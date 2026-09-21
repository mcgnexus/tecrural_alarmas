import type { WeatherHourly } from "@/lib/dominio/proveedores";

/** Desfase (min) de Europe/Madrid respecto a UTC en un instante dado. */
function offsetMadridMinutos(instante: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const partes = Object.fromEntries(
    dtf.formatToParts(instante).map((p) => [p.type, p.value]),
  );
  const comoUtc = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour) % 24,
    Number(partes.minute),
    Number(partes.second),
  );
  return (comoUtc - instante.getTime()) / 60000;
}

/** Instante UTC correspondiente a las 00:00 de hoy en Europe/Madrid. */
export function inicioDelDiaMadrid(momento: Date = new Date()): Date {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const partes = Object.fromEntries(
    dtf.formatToParts(momento).map((p) => [p.type, p.value]),
  );
  const aproximado = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    0,
    0,
    0,
  );
  const offset = offsetMadridMinutos(new Date(aproximado));
  return new Date(aproximado - offset * 60000);
}

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
