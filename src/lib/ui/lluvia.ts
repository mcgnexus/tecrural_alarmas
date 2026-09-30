export interface NivelLluvia {
  id: string;
  etiqueta: string;
  texto: string;
  fondo: string;
}

interface Tramo {
  hasta: number;
  nivel: NivelLluvia;
}

/**
 * Tramos de lluvia en mm. Los cortes siguen un orden de magnitud a partir de
 * ~10 mm/día, que es cuando el agua deja de ser/absorberse y empieza a
 * acumularse en el suelo o a golpear el cultivo.
 */
const TRAMOS: Tramo[] = [
  {
    hasta: 0.5,
    nivel: {
      id: "seco",
      etiqueta: "Sin lluvia relevante",
      texto: "text-stone-900",
      fondo: "bg-stone-100 text-stone-800 border-stone-200",
    },
  },
  {
    hasta: 5,
    nivel: {
      id: "ligera",
      etiqueta: "Lluvia ligera",
      texto: "text-sky-700",
      fondo: "bg-sky-50 text-sky-800 border-sky-200",
    },
  },
  {
    hasta: 15,
    nivel: {
      id: "moderada",
      etiqueta: "Lluvia moderada",
      texto: "text-amber-700",
      fondo: "bg-amber-50 text-amber-900 border-amber-200",
    },
  },
  {
    hasta: 30,
    nivel: {
      id: "abundante",
      etiqueta: "Lluvia abundante",
      texto: "text-orange-700",
      fondo: "bg-orange-50 text-orange-900 border-orange-200",
    },
  },
  {
    hasta: 60,
    nivel: {
      id: "muy-abundante",
      etiqueta: "Lluvia muy abundante: posible daño en el cultivo",
      texto: "text-red-700",
      fondo: "bg-red-50 text-red-900 border-red-200",
    },
  },
  {
    hasta: Number.POSITIVE_INFINITY,
    nivel: {
      id: "extrema",
      etiqueta: "Lluvia extrema: riesgo de inundación",
      texto: "text-red-900",
      fondo: "bg-red-100 text-red-950 border-red-300",
    },
  },
];

/** Nivel de lluvia en mm, o null si no es un número válido. */
export function nivelLluvia(mm: number | null | undefined): NivelLluvia | null {
  if (typeof mm !== "number" || !Number.isFinite(mm)) return null;
  return TRAMOS.find((tramo) => mm <= tramo.hasta)!.nivel;
}

/** Clase Tailwind de color de texto según la lluvia. */
export function colorLluvia(mm: number | null | undefined): string {
  return nivelLluvia(mm)?.texto ?? "text-stone-900";
}

/** Clase Tailwind de fondo + borde + texto para etiquetas de lluvia. */
export function fondoLluvia(mm: number | null | undefined): string {
  return nivelLluvia(mm)?.fondo ?? "bg-stone-100 text-stone-800 border-stone-200";
}

/** Nombre legible del nivel de lluvia (para aria/title, nunca solo color). */
export function etiquetaLluvia(mm: number | null | undefined): string {
  return nivelLluvia(mm)?.etiqueta ?? "Sin dato";
}
