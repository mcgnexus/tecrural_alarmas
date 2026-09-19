import type { CulturaId } from "@/lib/cultivos/catalogo";

const MAPA_SLUG_A_CULTURA: Record<string, CulturaId> = {
  almond: "almendro",
  olive: "olivar",
  pistachio: "pistacho",
  cereal: "cereal",
  avocado: "aguacate",
  mango: "mango",
  custard_apple: "chirimoya",
};

/** Traduce el slug de `plataforma.crops` al id del catálogo interno. */
export function culturaDesdeSlugPlataforma(slug: string): CulturaId | null {
  return MAPA_SLUG_A_CULTURA[slug] ?? null;
}

/** Traduce el id del catálogo interno al slug de `plataforma.crops`. */
export function slugPlataformaDesdeCultura(cultura: CulturaId): string | null {
  for (const [slug, id] of Object.entries(MAPA_SLUG_A_CULTURA)) {
    if (id === cultura) return slug;
  }
  return null;
}
