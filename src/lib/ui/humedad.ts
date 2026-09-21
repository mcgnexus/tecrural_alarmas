export interface NivelHumedad {
  id: string;
  etiqueta: string;
  texto: string;
  fondo: string;
}

interface Tramo {
  hasta: number;
  nivel: NivelHumedad;
}

const TRAMOS: Tramo[] = [
  {
    hasta: 20,
    nivel: {
      id: "muy-seco",
      etiqueta: "Aire muy seco",
      texto: "text-red-700",
      fondo: "bg-red-50 text-red-900 border-red-200",
    },
  },
  {
    hasta: 30,
    nivel: {
      id: "seco",
      etiqueta: "Aire seco",
      texto: "text-orange-700",
      fondo: "bg-orange-50 text-orange-900 border-orange-200",
    },
  },
  {
    hasta: 40,
    nivel: {
      id: "poco-humedo",
      etiqueta: "Poco húmedo",
      texto: "text-amber-700",
      fondo: "bg-amber-50 text-amber-900 border-amber-200",
    },
  },
  {
    hasta: 60,
    nivel: {
      id: "optimo",
      etiqueta: "Humedad óptima",
      texto: "text-emerald-700",
      fondo: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
  },
  {
    hasta: 75,
    nivel: {
      id: "humedo",
      etiqueta: "Húmedo",
      texto: "text-sky-700",
      fondo: "bg-sky-50 text-sky-800 border-sky-200",
    },
  },
  {
    hasta: 90,
    nivel: {
      id: "muy-humedo",
      etiqueta: "Muy húmedo",
      texto: "text-blue-700",
      fondo: "bg-blue-50 text-blue-800 border-blue-200",
    },
  },
  {
    hasta: Number.POSITIVE_INFINITY,
    nivel: {
      id: "saturacion",
      etiqueta: "Saturación (riesgo de rocío)",
      texto: "text-blue-900",
      fondo: "bg-blue-100 text-blue-900 border-blue-300",
    },
  },
];

/** Nivel de humedad relativa (%) o null si no es un número válido. */
export function nivelHumedad(pct: number | null | undefined): NivelHumedad | null {
  if (typeof pct !== "number" || !Number.isFinite(pct)) return null;
  return TRAMOS.find((tramo) => pct <= tramo.hasta)!.nivel;
}

/** Clase Tailwind de color de texto según la humedad. */
export function colorHumedad(pct: number | null | undefined): string {
  return nivelHumedad(pct)?.texto ?? "text-stone-900";
}

/** Clase Tailwind de fondo + borde + texto para etiquetas de humedad. */
export function fondoHumedad(pct: number | null | undefined): string {
  return nivelHumedad(pct)?.fondo ?? "bg-stone-100 text-stone-800 border-stone-200";
}

/** Nombre legible del nivel de humedad (para aria/title, nunca solo color). */
export function etiquetaHumedad(pct: number | null | undefined): string {
  return nivelHumedad(pct)?.etiqueta ?? "Sin dato";
}
