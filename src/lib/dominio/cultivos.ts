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
