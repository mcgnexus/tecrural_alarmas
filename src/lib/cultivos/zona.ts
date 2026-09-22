export type ZonaCultivo = "altiplano" | "costa";

/**
 * Zonas de cultivo de Granada usadas por TecRural. El altiplano es frío y de
 * interior (norte); la costa tropical es cálida y subtropical (sur).
 */
const REFERENCIAS: Array<{ lat: number; lon: number; zona: ZonaCultivo }> = [
  // Altiplano de Granada
  { lat: 37.8106, lon: -2.5412, zona: "altiplano" }, // Huéscar
  { lat: 37.4897, lon: -2.7735, zona: "altiplano" }, // Baza
  { lat: 37.9587, lon: -2.4354, zona: "altiplano" }, // Puebla de Don Fadrique
  { lat: 37.7969, lon: -2.9415, zona: "altiplano" }, // Castril
  { lat: 37.6425, lon: -2.4788, zona: "altiplano" }, // Orce
  { lat: 37.6833, lon: -2.55, zona: "altiplano" }, // Galera
  { lat: 37.5833, lon: -2.4744, zona: "altiplano" }, // Cúllar
  // Costa Tropical
  { lat: 36.7352, lon: -3.6916, zona: "costa" }, // Almuñécar
  { lat: 36.6206, lon: -3.7348, zona: "costa" }, // La Herradura
  { lat: 36.7447, lon: -3.5849, zona: "costa" }, // Salobreña
  { lat: 36.7448, lon: -3.3426, zona: "costa" }, // Motril
];

/** Radio máx. (en grados, ~39 km) para asignar una zona por cercanía. */
const TOLERANCIA_GRADOS = 0.35;

/**
 * Zona de cultivo más probable según las coordenadas (centroide más cercano).
 * Devuelve null si el punto queda lejos de las zonas conocidas.
 */
export function zonaCultivoPorCoordenadas(
  latitud: number,
  longitud: number,
): ZonaCultivo | null {
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return null;
  let mejor: ZonaCultivo | null = null;
  let distancia = Number.POSITIVE_INFINITY;
  for (const referencia of REFERENCIAS) {
    const d =
      (latitud - referencia.lat) ** 2 + (longitud - referencia.lon) ** 2;
    if (d < distancia) {
      distancia = d;
      mejor = referencia.zona;
    }
  }
  if (distancia <= TOLERANCIA_GRADOS ** 2) return mejor;
  // Fallback por latitud: Costa Tropical es subtropical (< ~37.0), Altiplano es norte (> ~37.3)
  if (latitud < 37.0) return "costa";
  if (latitud > 37.3) return "altiplano";
  return mejor;
}

export function etiquetaZona(zona: ZonaCultivo | null | undefined): string {
  if (zona === "altiplano") return "Altiplano";
  if (zona === "costa") return "Costa Tropical";
  return "Sin zona";
}

/** La Costa Tropical prioriza viento; no genera una tarjeta/alerta de helada. */
export function riesgoRelevanteEnZona(tipo: string, zona: ZonaCultivo | null): boolean {
  return !(zona === "costa" && tipo === "helada");
}
