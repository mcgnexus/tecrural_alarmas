export const RAIF_RSS_URL = "https://www.juntadeandalucia.es/agriculturapescaaguaydesarrollorural/raif/feed/";

/** Dominios oficiales permitidos para artículos y documentos enlazados. */
export function esDominioOficialRaif(valor: string): boolean {
  try {
    const hostname = new URL(valor).hostname.toLowerCase();
    return hostname === "juntadeandalucia.es" || hostname.endsWith(".juntadeandalucia.es") || hostname === "junta-andalucia.es" || hostname.endsWith(".junta-andalucia.es");
  } catch {
    return false;
  }
}

export const CULTIVOS_RAIF = [
  { slug: "almond", nombre: "Almendro" },
  { slug: "olive", nombre: "Olivar" },
  { slug: "pistachio", nombre: "Pistacho" },
  { slug: "cereal", nombre: "Cereal" },
  { slug: "avocado", nombre: "Aguacate" },
  { slug: "mango", nombre: "Mango" },
  { slug: "custard_apple", nombre: "Chirimoya" },
] as const;

export const MUNICIPIOS_RAIF = [
  "Baza", "Huéscar", "Puebla de Don Fadrique", "Castril", "Orce", "Galera", "Cúllar", "Caniles", "Benamaurel", "Freila", "Zújar",
  "Motril", "Almuñécar", "La Herradura", "Salobreña", "Vélez de Benaudalla", "Ítrabo", "Los Guájares", "Molvízar", "Jete", "Otívar", "Lújar", "Polopos", "Sorvilán", "Gualchos", "Castell de Ferro",
] as const;

export const REGIONES_RAIF = ["Altiplano de Granada", "Costa Tropical"] as const;
