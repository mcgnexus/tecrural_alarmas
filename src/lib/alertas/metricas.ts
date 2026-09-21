import type { TipoAlerta } from "@/lib/dominio/tipos";

export interface MetricaAlerta {
  etiqueta: string;
  valor: string;
  /** Temperatura en °C, si la métrica es térmica (para el color). */
  temperaturaC?: number;
}

function numeroDe(mensaje: string, re: RegExp): number | null {
  const m = mensaje.match(re);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatear(valor: number, decimales = 1): string {
  return valor.toLocaleString("es-ES", { maximumFractionDigits: decimales });
}

/** Frase corta que describe cuándo/para qué aplica la alerta. */
export function subtituloDeAlerta(tipo: TipoAlerta | string): string {
  switch (tipo) {
    case "helada":
      return "Esta madrugada";
    case "golpe-de-calor":
      return "Horas centrales del día";
    case "viento":
      return "Rachas previstas";
    case "demanda-hidrica":
      return "Estimación orientativa de riego";
    default:
      return "Detalle de la alerta";
  }
}

/**
 * Métricas reales de una alerta, extraídas de su mensaje y según su tipo. No
 * inventa valores: si un dato no está en el mensaje, no se muestra.
 */
export function metricasDeAlerta(
  tipo: TipoAlerta | string,
  mensaje: string,
): MetricaAlerta[] {
  switch (tipo) {
    case "helada": {
      const min = numeroDe(mensaje, /([-\d.,]+)\s*°C/);
      if (min === null) return [];
      return [{ etiqueta: "Mínima prevista", valor: `${formatear(min)} °C`, temperaturaC: min }];
    }
    case "golpe-de-calor": {
      const max = numeroDe(mensaje, /([-\d.,]+)\s*°C/);
      if (max === null) return [];
      return [{ etiqueta: "Máxima prevista", valor: `${formatear(max)} °C`, temperaturaC: max }];
    }
    case "viento": {
      const metricas: MetricaAlerta[] = [];
      const racha = numeroDe(mensaje, /([\d.,]+)\s*km\/h/);
      if (racha !== null) metricas.push({ etiqueta: "Racha máxima", valor: `${formatear(racha, 0)} km/h` });
      const medio = numeroDe(mensaje, /viento medio\s+([\d.,]+)\s*km\/h/i);
      if (medio !== null) metricas.push({ etiqueta: "Viento medio", valor: `${formatear(medio, 0)} km/h` });
      return metricas;
    }
    case "demanda-hidrica": {
      const metricas: MetricaAlerta[] = [];
      const etcDia = numeroDe(mensaje, /unos\s+([\d.,]+)\s*mm\/día/i);
      const etc7d = numeroDe(mensaje, /ETc\s+([\d.,]+)\s*mm/i);
      if (etcDia !== null) metricas.push({ etiqueta: "Demanda del cultivo (ETc)", valor: `${formatear(etcDia)} mm/día` });
      else if (etc7d !== null) metricas.push({ etiqueta: "Demanda del cultivo (ETc)", valor: `${formatear(etc7d)} mm (7 días)` });

      const etoDia = numeroDe(mensaje, /ETo\s+([\d.,]+)\s*mm\/día/i);
      const eto7d = numeroDe(mensaje, /ET0\s+([\d.,]+)\s*mm/i);
      if (etoDia !== null) metricas.push({ etiqueta: "ETo", valor: `${formatear(etoDia)} mm/día` });
      else if (eto7d !== null) metricas.push({ etiqueta: "ETo", valor: `${formatear(eto7d)} mm (7 días)` });

      const kc = numeroDe(mensaje, /Kc\s+([\d.,]+)/i);
      if (kc !== null) metricas.push({ etiqueta: "Coeficiente Kc", valor: formatear(kc, 2) });

      const deficit = numeroDe(mensaje, /déficit\s+([-\d.,]+)\s*mm/i);
      if (deficit !== null) metricas.push({ etiqueta: "Déficit (7 días)", valor: `${formatear(deficit)} mm` });

      return metricas;
    }
    default:
      return [];
  }
}
