import type { CulturaId } from "@/lib/cultivos/catalogo";

export interface AvisoFitosanitario {
  id: string;
  plaga: string;
  organismo: string;
  cultivo: CulturaId;
  recomendacion: string;
  fuente: string;
  fuenteUrl: string;
  vigenteDesde: string;
}

export const avisosFitosanitariosEjemplo: AvisoFitosanitario[] = [
  {
    id: "moscas-del-olivo",
    plaga: "Mosca del olivo",
    organismo: "Bactrocera oleae",
    cultivo: "olivar",
    recomendacion:
      "Vigila las capturas en trampeo. Trata al superar el umbral de daño económico; respeta los plazos de seguridad.",
    fuente: "RAIF · Junta de Andalucía",
    fuenteUrl: "https://www.juntadeandalucia.es/agriculturaypesca/raif/",
    vigenteDesde: "2026-05-01",
  },
  {
    id: "xylella",
    plaga: "Bacteria Xylella fastidiosa",
    organismo: "Xylella fastidiosa",
    cultivo: "almendro",
    recomendacion:
      "Obligación de notificar síntomas (decoloraciones, marchitamientos). Sigue los protocolos oficiales en tu municipio.",
    fuente: "RAIF · Junta de Andalucía",
    fuenteUrl: "https://www.juntadeandalucia.es/agriculturaypesca/raif/",
    vigenteDesde: "2026-01-01",
  },
];