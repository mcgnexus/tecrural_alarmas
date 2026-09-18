import type { FuenteDatos } from "@/lib/dominio/tipos";

interface MetadatosFuente {
  nombre: string;
  url: string;
  licencia: string;
}

export const METADATOS_FUENTE: Record<string, MetadatosFuente> = {
  "open-meteo": {
    nombre: "Open-Meteo",
    url: "https://open-meteo.com",
    licencia: "Datos abiertos (modelos meteorológicos)",
  },
  aemet: {
    nombre: "AEMET",
    url: "https://www.aemet.es",
    licencia: "AEMET OpenData (reutilización permitida citando la fuente)",
  },
  siar: {
    nombre: "SiAR",
    url: "https://www.mapa.gob.es/es/agricultura/temas/sistema-de-informacion-agroclimatica-para-el-regadio/",
    licencia: "Datos agroclimáticos oficiales (SiAR)",
  },
  raif: {
    nombre: "RAIF",
    url: "https://www.juntadeandalucia.es/agriculturapescaaguaydesarrollorural/raif",
    licencia: "Avisos fitosanitarios oficiales (RAIF)",
  },
};

export function fuenteDesdeProveedor(
  id: string,
  consultadaEn: string,
): FuenteDatos {
  const metadatos = METADATOS_FUENTE[id] ?? { nombre: id, url: "", licencia: "" };
  return {
    id,
    nombre: metadatos.nombre,
    url: metadatos.url,
    licencia: metadatos.licencia,
    consultadaEn,
  };
}
