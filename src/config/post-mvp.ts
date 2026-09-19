/**
 * Evolución post-MVP — una vez validado (50 usuarios, 20 parcelas, 10 con alertas, 5 conversaciones, 1-2 pilotos)
 * No desarrollar hasta analizar resultados. Lista de 72:
 */
export const POST_MVP_FUTURE = [
  "sensores TecRural",
  "estaciones meteorológicas",
  "humedad de suelo",
  "diagnóstico IA",
  "Kc",
  "ETc",
  "recomendaciones de riego",
  "parcelas múltiples",
  "histórico",
  "informes",
  "cooperativas",
  "multiusuario",
  "mapas",
  "satélite",
  "NDVI",
  "API",
] as const;

// Guard para evitar desarrollo prematuro
export function esPostMvp(feature: string): boolean {
  return (POST_MVP_FUTURE as readonly string[]).includes(feature);
}
