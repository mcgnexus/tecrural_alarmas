import type {
  ClimaPunto,
  CondicionesActuales,
  PrevisionDiaria,
} from "@/lib/dominio/tipos";
import type { WeatherHourly } from "@/lib/dominio/proveedores";
import { horaMasCercana } from "@/lib/normalizacion/horario";
import { fuenteDesdeProveedor } from "@/lib/proveedores/fuentes";

function soloNumeros(valores: (number | null)[]): number[] {
  return valores.filter((v): v is number => v !== null);
}

/**
 * Capa 4 (motor meteorológico): agrega el formato horario canónico
 * (`WeatherHourly[]`) al modelo diario `ClimaPunto` que consumen el motor
 * agronómico y el de alertas.
 */
export function agregarHorario(horas: WeatherHourly[]): ClimaPunto {
  const primera = horas[0];
  if (!primera) throw new Error("Serie horaria vacía");

  const porDia = new Map<string, WeatherHourly[]>();
  for (const hora of horas) {
    const dia = hora.timestamp.slice(0, 10);
    const lista = porDia.get(dia) ?? [];
    lista.push(hora);
    porDia.set(dia, lista);
  }

  // La previsión diaria debe ser de días futuros (la serie puede incluir el
  // pasado para el balance hídrico).
  const hoy = new Date().toISOString().slice(0, 10);
  const diasFuturos = [...porDia.entries()].filter(([fecha]) => fecha >= hoy);
  const diasPrevistos =
    diasFuturos.length > 0
      ? diasFuturos.slice(0, 5)
      : [...porDia.entries()].slice(-5);

  const prevision: PrevisionDiaria[] = diasPrevistos.map(([fecha, diarias]) => {
      const temperaturas = soloNumeros(diarias.map((h) => h.temperatureC));
      const rachas = soloNumeros(diarias.map((h) => h.windGustKmh));
      const probabilidades = soloNumeros(
        diarias.map((h) => h.precipitationProbabilityPct),
      );
      const precipitaciones = soloNumeros(
        diarias.map((h) => h.precipitationMm),
      );
      return {
        fecha,
        tMin: temperaturas.length ? Math.min(...temperaturas) : 0,
        tMax: temperaturas.length ? Math.max(...temperaturas) : 0,
        rachaMaxKmh: rachas.length ? Math.max(...rachas) : 0,
        probPrecipitacionMax: probabilidades.length
          ? Math.max(...probabilidades)
          : 0,
        precipitacionTotal: Number(
          precipitaciones.reduce((total, valor) => total + valor, 0).toFixed(1),
        ),
      };
    });

  const cercana = horaMasCercana(horas);
  const actual: CondicionesActuales = {
    temperatura: cercana.temperatureC ?? 0,
    sensacionTermica: cercana.apparentTemperatureC ?? 0,
    vientoKmh: cercana.windSpeedKmh ?? 0,
    rachaKmh: cercana.windGustKmh ?? 0,
    precipitacionUltimaHora: cercana.precipitationMm ?? 0,
    humedadRelativa: cercana.relativeHumidityPct ?? 0,
  };

  return {
    latitud: primera.latitude,
    longitud: primera.longitude,
    actual,
    prevision,
    fuente: fuenteDesdeProveedor(primera.provider, primera.fetchedAt),
  };
}
