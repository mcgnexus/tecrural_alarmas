import type { ZonaCultivo } from "./zona";

export type CulturaId =
  | "almendro"
  | "olivar"
  | "pistacho"
  | "cereal"
  | "aguacate"
  | "mango"
  | "chirimoya";

export interface UmbralesTermicos {
  tminMortal: number;
  tminHelada: number;
  tmaxEstres: number;
  vientoCriticoKmh: number;
  etdUmbralMm: number;
}

export interface RangoMeses {
  mesDesde: number;
  mesHasta: number;
}

export interface FaseFenologica {
  id: string;
  etiqueta: string;
  mesDesde: number;
  mesHasta: number;
  /**
   * Ventana específica de una zona. Si no se indica, se usan `mesDesde`/
   * `mesHasta` (que equivalen a la zona de referencia del cultivo). Las ventanas
   * son orientativas y se ajustan según la zona de cultivo: la costa tropical va
   * por delante y el altiplano por detrás.
   */
  porZona?: Partial<Record<ZonaCultivo, RangoMeses>>;
  sensibleHelada?: number;
  factorKc: number;
}

export interface Cultura {
  id: CulturaId;
  nombre: string;
  nombreCientifico: string;
  factorKc: number;
  umbrales: UmbralesTermicos;
  fenologia: FaseFenologica[];
}

export const catalogoCultivos: Record<CulturaId, Cultura> = {
  almendro: {
    id: "almendro",
    nombre: "Almendro",
    nombreCientifico: "Prunus dulcis",
    factorKc: 0.8,
    umbrales: {
      tminMortal: -2.5,
      tminHelada: 0,
      tmaxEstres: 38,
      vientoCriticoKmh: 45,
      etdUmbralMm: 5,
    },
    fenologia: [
      { id: "reposo", etiqueta: "Reposo vegetativo", mesDesde: 11, mesHasta: 1, porZona: { costa: { mesDesde: 11, mesHasta: 12 } }, factorKc: 0.4 },
      { id: "floracion", etiqueta: "Floración", mesDesde: 2, mesHasta: 3, porZona: { costa: { mesDesde: 1, mesHasta: 3 } }, sensibleHelada: -1.5, factorKc: 0.5 },
      { id: "cuajado", etiqueta: "Cuajado de fruto", mesDesde: 3, mesHasta: 4, porZona: { costa: { mesDesde: 2, mesHasta: 4 } }, sensibleHelada: -2, factorKc: 0.7 },
      { id: "engorde", etiqueta: "Engorde del fruto", mesDesde: 5, mesHasta: 7, porZona: { costa: { mesDesde: 4, mesHasta: 7 } }, factorKc: 0.9 },
      { id: "envero", etiqueta: "Envero", mesDesde: 7, mesHasta: 8, factorKc: 1.15 },
      { id: "recoleccion", etiqueta: "Recolección", mesDesde: 8, mesHasta: 9, porZona: { costa: { mesDesde: 7, mesHasta: 9 } }, factorKc: 1 },
    ],
  },
  olivar: {
    id: "olivar",
    nombre: "Olivar",
    nombreCientifico: "Olea europaea",
    factorKc: 0.7,
    umbrales: {
      tminMortal: -8,
      tminHelada: -5,
      tmaxEstres: 42,
      vientoCriticoKmh: 70,
      etdUmbralMm: 4.5,
    },
    fenologia: [
      { id: "reposo", etiqueta: "Reposo vegetativo", mesDesde: 11, mesHasta: 1, porZona: { costa: { mesDesde: 11, mesHasta: 12 } }, factorKc: 0.5 },
      { id: "brotacion", etiqueta: "Brotación", mesDesde: 2, mesHasta: 3, porZona: { costa: { mesDesde: 1, mesHasta: 3 } }, factorKc: 0.6 },
      { id: "floracion", etiqueta: "Floración", mesDesde: 4, mesHasta: 5, porZona: { costa: { mesDesde: 3, mesHasta: 5 } }, sensibleHelada: -2, factorKc: 0.7 },
      { id: "cuajado", etiqueta: "Cuajado", mesDesde: 5, mesHasta: 6, factorKc: 0.85 },
      { id: "engorde", etiqueta: "Engorde de aceituna", mesDesde: 6, mesHasta: 8, factorKc: 1.05 },
      { id: "envero", etiqueta: "Envero", mesDesde: 9, mesHasta: 10, factorKc: 1.1 },
      { id: "recoleccion", etiqueta: "Recolección", mesDesde: 10, mesHasta: 11, factorKc: 0.9 },
    ],
  },
  pistacho: {
    id: "pistacho",
    nombre: "Pistacho",
    nombreCientifico: "Pistacia vera",
    factorKc: 0.85,
    umbrales: {
      tminMortal: -8,
      tminHelada: -5,
      tmaxEstres: 40,
      vientoCriticoKmh: 55,
      etdUmbralMm: 5,
    },
    fenologia: [
      { id: "reposo", etiqueta: "Reposo", mesDesde: 11, mesHasta: 2, porZona: { costa: { mesDesde: 11, mesHasta: 1 } }, factorKc: 0.4 },
      { id: "brotacion", etiqueta: "Brotación", mesDesde: 3, mesHasta: 4, porZona: { costa: { mesDesde: 2, mesHasta: 4 } }, sensibleHelada: -2, factorKc: 0.6 },
      { id: "floracion", etiqueta: "Floración", mesDesde: 4, mesHasta: 5, porZona: { costa: { mesDesde: 3, mesHasta: 5 } }, sensibleHelada: -1, factorKc: 0.75 },
      { id: "cuajado", etiqueta: "Cuajado", mesDesde: 5, mesHasta: 6, factorKc: 0.9 },
      { id: "llenado", etiqueta: "Llenado de fruto", mesDesde: 6, mesHasta: 8, factorKc: 1 },
      { id: "recoleccion", etiqueta: "Recolección", mesDesde: 9, mesHasta: 10, factorKc: 0.85 },
    ],
  },
  cereal: {
    id: "cereal",
    nombre: "Cereal",
    nombreCientifico: "Triticum spp. / Hordeum vulgare",
    factorKc: 0.8,
    umbrales: {
      tminMortal: -7,
      tminHelada: -4,
      tmaxEstres: 34,
      vientoCriticoKmh: 40,
      etdUmbralMm: 4,
    },
    fenologia: [
      { id: "siembra", etiqueta: "Siembra", mesDesde: 10, mesHasta: 11, porZona: { costa: { mesDesde: 10, mesHasta: 12 } }, factorKc: 0.3 },
      { id: "ahijado", etiqueta: "Ahijado", mesDesde: 12, mesHasta: 2, porZona: { costa: { mesDesde: 12, mesHasta: 1 } }, sensibleHelada: -3, factorKc: 0.6 },
      { id: "encanado", etiqueta: "Encañado", mesDesde: 3, mesHasta: 4, porZona: { costa: { mesDesde: 2, mesHasta: 4 } }, sensibleHelada: -2, factorKc: 0.9 },
      { id: "espigado", etiqueta: "Espigado", mesDesde: 4, mesHasta: 5, porZona: { costa: { mesDesde: 3, mesHasta: 5 } }, sensibleHelada: 0, factorKc: 1.1 },
      { id: "grano", etiqueta: "Llenado de grano", mesDesde: 5, mesHasta: 6, factorKc: 1 },
      { id: "recoleccion", etiqueta: "Recolección", mesDesde: 6, mesHasta: 7, factorKc: 0.7 },
    ],
  },
  aguacate: {
    id: "aguacate",
    nombre: "Aguacate",
    nombreCientifico: "Persea americana",
    factorKc: 0.85,
    umbrales: {
      tminMortal: -2,
      tminHelada: 0,
      tmaxEstres: 36,
      vientoCriticoKmh: 35,
      etdUmbralMm: 4.5,
    },
    fenologia: [
      { id: "floracion", etiqueta: "Floración", mesDesde: 3, mesHasta: 4, porZona: { altiplano: { mesDesde: 4, mesHasta: 5 } }, sensibleHelada: 0, factorKc: 0.7 },
      { id: "cuajado", etiqueta: "Cuajado", mesDesde: 5, mesHasta: 6, porZona: { altiplano: { mesDesde: 6, mesHasta: 7 } }, factorKc: 0.8 },
      { id: "crecimiento", etiqueta: "Crecimiento del fruto", mesDesde: 6, mesHasta: 10, porZona: { altiplano: { mesDesde: 7, mesHasta: 11 } }, factorKc: 0.95 },
      { id: "recoleccion", etiqueta: "Recolección", mesDesde: 11, mesHasta: 4, porZona: { altiplano: { mesDesde: 11, mesHasta: 5 } }, factorKc: 0.8 },
    ],
  },
  mango: {
    id: "mango",
    nombre: "Mango",
    nombreCientifico: "Mangifera indica",
    factorKc: 0.85,
    umbrales: {
      tminMortal: 0,
      tminHelada: 2,
      tmaxEstres: 38,
      vientoCriticoKmh: 35,
      etdUmbralMm: 5,
    },
    fenologia: [
      { id: "floracion", etiqueta: "Floración", mesDesde: 2, mesHasta: 4, porZona: { altiplano: { mesDesde: 3, mesHasta: 5 } }, sensibleHelada: 0, factorKc: 0.7 },
      { id: "cuajado", etiqueta: "Cuajado", mesDesde: 4, mesHasta: 5, porZona: { altiplano: { mesDesde: 5, mesHasta: 6 } }, factorKc: 0.8 },
      { id: "crecimiento", etiqueta: "Crecimiento del fruto", mesDesde: 5, mesHasta: 8, porZona: { altiplano: { mesDesde: 6, mesHasta: 9 } }, factorKc: 1 },
      { id: "recoleccion", etiqueta: "Recolección", mesDesde: 8, mesHasta: 10, porZona: { altiplano: { mesDesde: 9, mesHasta: 11 } }, factorKc: 0.85 },
    ],
  },
  chirimoya: {
    id: "chirimoya",
    nombre: "Chirimoyo",
    nombreCientifico: "Annona cherimola",
    factorKc: 0.8,
    umbrales: {
      tminMortal: 0,
      tminHelada: 2,
      tmaxEstres: 36,
      vientoCriticoKmh: 35,
      etdUmbralMm: 4.5,
    },
    fenologia: [
      { id: "brotacion", etiqueta: "Brotación", mesDesde: 2, mesHasta: 3, porZona: { altiplano: { mesDesde: 3, mesHasta: 4 } }, sensibleHelada: 1, factorKc: 0.6 },
      { id: "floracion", etiqueta: "Floración", mesDesde: 4, mesHasta: 6, porZona: { altiplano: { mesDesde: 5, mesHasta: 7 } }, sensibleHelada: 1, factorKc: 0.7 },
      { id: "desarrollo", etiqueta: "Desarrollo del fruto", mesDesde: 6, mesHasta: 9, porZona: { altiplano: { mesDesde: 7, mesHasta: 10 } }, factorKc: 0.95 },
      { id: "recoleccion", etiqueta: "Recolección", mesDesde: 10, mesHasta: 2, porZona: { altiplano: { mesDesde: 11, mesHasta: 3 } }, factorKc: 0.8 },
    ],
  },
};

/** ¿El mes (1-12) cae dentro del rango, admitiendo rangos que cruzan el año? */
export function mesEnRango(mes: number, mesDesde: number, mesHasta: number): boolean {
  const fin = mesDesde > mesHasta ? mesHasta + 12 : mesHasta;
  const m = mes < mesDesde ? mes + 12 : mes;
  return m >= mesDesde && m <= fin;
}

/** Ventana de meses de una fase para una zona (o la genérica si no hay override). */
export function rangoDeFase(fase: FaseFenologica, zona?: ZonaCultivo | null): RangoMeses {
  const especifico = zona ? fase.porZona?.[zona] : undefined;
  return especifico ?? { mesDesde: fase.mesDesde, mesHasta: fase.mesHasta };
}

/**
 * Fase fenológica teórica del cultivo para una fecha y, opcionalmente, una zona
 * de cultivo. Si se pasa `zona`, se usan sus ventanas específicas; si no, la
 * ventana genérica del cultivo.
 */
export function faseActiva(
  cultivo: Cultura,
  momento: Date,
  zona?: ZonaCultivo | null,
): FaseFenologica | null {
  const mes = momento.getMonth() + 1;
  for (const fase of cultivo.fenologia) {
    const { mesDesde, mesHasta } = rangoDeFase(fase, zona);
    if (mesEnRango(mes, mesDesde, mesHasta)) return fase;
  }
  return null;
}
