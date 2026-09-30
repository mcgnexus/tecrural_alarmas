export interface NivelViento {
  id: string;
  etiqueta: string;
  texto: string;
  fondo: string;
}

interface Tramo {
  hasta: number;
  nivel: NivelViento;
}

/**
 * Tramos de viento en km/h. El color sube con la importancia para el cultivo:
 * por encima de ~40 km/h un cultivo de porte alto o en floración puede suffer
 * daños mecánicos, y por encima de ~70 km/h el trabajo de campo es peligroso.
 */
const TRAMOS: Tramo[] = [
  {
    hasta: 10,
    nivel: {
      id: "calma",
      etiqueta: "Calma",
      texto: "text-emerald-700",
      fondo: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
  },
  {
    hasta: 25,
    nivel: {
      id: "suave",
      etiqueta: "Viento suave",
      texto: "text-stone-900",
      fondo: "bg-stone-100 text-stone-800 border-stone-200",
    },
  },
  {
    hasta: 40,
    nivel: {
      id: "moderado",
      etiqueta: "Viento moderado",
      texto: "text-amber-700",
      fondo: "bg-amber-50 text-amber-900 border-amber-200",
    },
  },
  {
    hasta: 55,
    nivel: {
      id: "fuerte",
      etiqueta: "Viento fuerte",
      texto: "text-orange-700",
      fondo: "bg-orange-50 text-orange-900 border-orange-200",
    },
  },
  {
    hasta: 70,
    nivel: {
      id: "muy-fuerte",
      etiqueta: "Viento muy fuerte",
      texto: "text-red-700",
      fondo: "bg-red-50 text-red-900 border-red-200",
    },
  },
  {
    hasta: Number.POSITIVE_INFINITY,
    nivel: {
      id: "extremo",
      etiqueta: "Viento extremo: no trabajes en campo",
      texto: "text-red-900",
      fondo: "bg-red-100 text-red-950 border-red-300",
    },
  },
];

/** Nivel de viento en km/h, o null si no es un número válido. */
export function nivelViento(kmh: number | null | undefined): NivelViento | null {
  if (typeof kmh !== "number" || !Number.isFinite(kmh)) return null;
  return TRAMOS.find((tramo) => kmh <= tramo.hasta)!.nivel;
}

/** Clase Tailwind de color de texto según el viento. */
export function colorViento(kmh: number | null | undefined): string {
  return nivelViento(kmh)?.texto ?? "text-stone-900";
}

/** Clase Tailwind de fondo + borde + texto para etiquetas de viento. */
export function fondoViento(kmh: number | null | undefined): string {
  return nivelViento(kmh)?.fondo ?? "bg-stone-100 text-stone-800 border-stone-200";
}

/** Nombre legible del nivel de viento (para aria/title, nunca solo color). */
export function etiquetaViento(kmh: number | null | undefined): string {
  return nivelViento(kmh)?.etiqueta ?? "Sin dato";
}
