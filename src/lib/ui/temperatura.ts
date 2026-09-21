export interface NivelTermico {
  id: string;
  etiqueta: string;
  texto: string;
  fondo: string;
}

interface Tramo {
  hasta: number;
  nivel: NivelTermico;
}

const TRAMOS: Tramo[] = [
  {
    hasta: -2,
    nivel: {
      id: "helada-fuerte",
      etiqueta: "Helada fuerte",
      texto: "text-blue-900",
      fondo: "bg-blue-100 text-blue-900 border-blue-300",
    },
  },
  {
    hasta: 0,
    nivel: {
      id: "helada",
      etiqueta: "Helada",
      texto: "text-blue-700",
      fondo: "bg-blue-50 text-blue-800 border-blue-200",
    },
  },
  {
    hasta: 3,
    nivel: {
      id: "riesgo-helada",
      etiqueta: "Riesgo de helada",
      texto: "text-sky-700",
      fondo: "bg-sky-50 text-sky-800 border-sky-200",
    },
  },
  {
    hasta: 10,
    nivel: {
      id: "frio",
      etiqueta: "Frío",
      texto: "text-cyan-700",
      fondo: "bg-cyan-50 text-cyan-800 border-cyan-200",
    },
  },
  {
    hasta: 18,
    nivel: {
      id: "templado",
      etiqueta: "Templado",
      texto: "text-emerald-700",
      fondo: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
  },
  {
    hasta: 26,
    nivel: {
      id: "calido",
      etiqueta: "Cálido",
      texto: "text-amber-700",
      fondo: "bg-amber-50 text-amber-900 border-amber-200",
    },
  },
  {
    hasta: 33,
    nivel: {
      id: "calor",
      etiqueta: "Calor",
      texto: "text-orange-700",
      fondo: "bg-orange-50 text-orange-900 border-orange-200",
    },
  },
  {
    hasta: Number.POSITIVE_INFINITY,
    nivel: {
      id: "calor-extremo",
      etiqueta: "Calor extremo",
      texto: "text-red-700",
      fondo: "bg-red-50 text-red-900 border-red-200",
    },
  },
];

/** Nivel térmico de un valor en °C, o null si no es un número válido. */
export function nivelTermico(valorC: number | null | undefined): NivelTermico | null {
  if (typeof valorC !== "number" || !Number.isFinite(valorC)) return null;
  return TRAMOS.find((tramo) => valorC <= tramo.hasta)!.nivel;
}

/** Clase Tailwind de color de texto según la temperatura. */
export function colorTemperatura(valorC: number | null | undefined): string {
  return nivelTermico(valorC)?.texto ?? "text-stone-900";
}

/** Clase Tailwind de fondo + borde + texto para etiquetas térmicas. */
export function fondoTermico(valorC: number | null | undefined): string {
  return nivelTermico(valorC)?.fondo ?? "bg-stone-100 text-stone-800 border-stone-200";
}

/** Nombre legible del nivel térmico (para aria/title, nunca solo color). */
export function etiquetaTermica(valorC: number | null | undefined): string {
  return nivelTermico(valorC)?.etiqueta ?? "Sin dato";
}
