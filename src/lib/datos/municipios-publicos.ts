export type MunicipioPublico = {
  name: string;
  slug: string;
  region: string;
  province: string;
  latitude: number;
  longitude: number;
  zona: "altiplano" | "costa";
  aemetMunicipio: string;
};

/** Localidades con coordenadas y código AEMET verificados para la consulta pública. */
export const MUNICIPIOS_PUBLICOS: MunicipioPublico[] = [
  { name: "Huéscar", slug: "huescar", region: "Altiplano de Granada", province: "Granada", latitude: 37.8106, longitude: -2.5412, zona: "altiplano", aemetMunicipio: "18098" },
  { name: "Baza", slug: "baza", region: "Altiplano de Granada", province: "Granada", latitude: 37.4897, longitude: -2.7735, zona: "altiplano", aemetMunicipio: "18023" },
  { name: "Puebla de Don Fadrique", slug: "puebla-de-don-fadrique", region: "Altiplano de Granada", province: "Granada", latitude: 37.9587, longitude: -2.4354, zona: "altiplano", aemetMunicipio: "18164" },
  { name: "Castril", slug: "castril", region: "Altiplano de Granada", province: "Granada", latitude: 37.7969, longitude: -2.9415, zona: "altiplano", aemetMunicipio: "18046" },
  { name: "Orce", slug: "orce", region: "Altiplano de Granada", province: "Granada", latitude: 37.6425, longitude: -2.4788, zona: "altiplano", aemetMunicipio: "18145" },
  { name: "Galera", slug: "galera", region: "Altiplano de Granada", province: "Granada", latitude: 37.6833, longitude: -2.55, zona: "altiplano", aemetMunicipio: "18077" },
  { name: "Cúllar", slug: "cullar", region: "Altiplano de Granada", province: "Granada", latitude: 37.5833, longitude: -2.4744, zona: "altiplano", aemetMunicipio: "18057" },
  { name: "Almuñécar", slug: "almunecar", region: "Costa Tropical", province: "Granada", latitude: 36.7352, longitude: -3.6916, zona: "costa", aemetMunicipio: "18017" },
  { name: "La Herradura", slug: "la-herradura", region: "Costa Tropical", province: "Granada", latitude: 36.6206, longitude: -3.7348, zona: "costa", aemetMunicipio: "18017" },
  { name: "Salobreña", slug: "salobrena", region: "Costa Tropical", province: "Granada", latitude: 36.7447, longitude: -3.5849, zona: "costa", aemetMunicipio: "18173" },
  { name: "Motril", slug: "motril", region: "Costa Tropical", province: "Granada", latitude: 36.7448, longitude: -3.3426, zona: "costa", aemetMunicipio: "18140" },
];

export function municipioPublicoPorSlug(slug: string): MunicipioPublico | undefined {
  return MUNICIPIOS_PUBLICOS.find((municipio) => municipio.slug === slug);
}
