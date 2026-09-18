/** Rejilla meteorológica reutilizable: 0.02°. */
export const MARGEN_GRID = 0.02;

export function redondearGrid(valor: number): number {
  return Math.round(valor / MARGEN_GRID) * MARGEN_GRID;
}

export function claveGrid(lat: number, lon: number): string {
  return `${redondearGrid(lat).toFixed(4)},${redondearGrid(lon).toFixed(4)}`;
}
