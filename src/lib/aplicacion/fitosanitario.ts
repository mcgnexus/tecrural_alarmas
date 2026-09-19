import { listarAlertasFitosanitarias } from "@/lib/datos/fitosanitario-repo";
import { listarAvisosOficiales } from "@/lib/datos/alertas-oficiales-repo";
import { listarCultivosPlataforma } from "@/lib/datos/catalogo-repo";
import { listarReglasRiesgo } from "@/lib/datos/reglas-repo";
import { obtenerClimaPunto } from "@/lib/clima/motor";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import type { RiskLevel } from "@/lib/dominio/riesgo";

const MENSAJE_FUNGICO =
  "Las condiciones meteorológicas pueden favorecer determinadas enfermedades fúngicas.";
const DISCLAIMER = "Esto no constituye un diagnóstico fitosanitario.";

/**
 * Aviso agroclimático TecRural (Tipo 2). Estimación propia, extremadamente
 * limitada, claramente separada del aviso oficial. Nunca diagnostica.
 */
export interface AvisoAgroclimatico {
  origen: "tecrural";
  tipo: "riesgo-fungico";
  nivel: string;
  cultivo: string;
  titulo: string;
  mensaje: string;
  disclaimer: string;
  condiciones: {
    temperaturaC: number;
    humedadRelativaPct: number;
    precipitacionUltimaHoraMm: number;
  };
}

function numero(valor: unknown, porDefecto: number): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : porDefecto;
}

export async function evaluarRiesgoFungicoAgroclimatico(
  lat: number,
  lon: number,
  cultivo: CulturaId,
): Promise<AvisoAgroclimatico | null> {
  const reglas = await listarReglasRiesgo({
    enabled: true,
    riskType: "riesgo-fungico",
  });
  const parametros = reglas[0]?.parameters ?? {};
  const humedad = (parametros.humidity ?? {}) as {
    yellow?: number;
    orange?: number;
  };
  const temperatura = (parametros.temperature ?? {}) as {
    minC?: number;
    maxC?: number;
  };
  const humedadAmarilla = numero(humedad.yellow, 80);
  const humedadNaranja = numero(humedad.orange, 90);
  const tempMin = numero(temperatura.minC, 8);
  const tempMax = numero(temperatura.maxC, 28);

  const clima = await obtenerClimaPunto(lat, lon);
  const temperaturaC = clima.actual.temperatura;
  const humedadRelativaPct = clima.actual.humedadRelativa;
  const precipitacionUltimaHoraMm = clima.actual.precipitacionUltimaHora;

  const rangoTermico = temperaturaC >= tempMin && temperaturaC <= tempMax;
  const nivel: string | null =
    humedadRelativaPct >= humedadNaranja
      ? "orange"
      : humedadRelativaPct >= humedadAmarilla
        ? "yellow"
        : precipitacionUltimaHoraMm > 0
          ? "yellow"
          : null;
  if (!rangoTermico || nivel === null) return null;

  return {
    origen: "tecrural",
    tipo: "riesgo-fungico",
    nivel,
    cultivo: catalogoCultivos[cultivo]?.nombre ?? cultivo,
    titulo: "Condiciones meteorológicas favorables a riesgo fúngico",
    mensaje: MENSAJE_FUNGICO,
    disclaimer: DISCLAIMER,
    condiciones: {
      temperaturaC,
      humedadRelativaPct,
      precipitacionUltimaHoraMm,
    },
  };
}

/**
 * Aviso oficial fitosanitario (Tipo 1). Se muestra tal cual, sin que TecRural
 * modifique el contenido técnico sustantivo.
 */
export interface AvisoFitosanitarioOficial {
  id: string;
  origen: "oficial";
  provider: string;
  externalId: string | null;
  fecha: string;
  cultivo: string | null;
  zona: string | null;
  titulo: string;
  resumen: string;
  enlace: string | null;
  severidad: string | null;
}

function zonaDe(municipio: string | null, provincia: string | null): string | null {
  const partes = [municipio, provincia].filter(
    (valor): valor is string => Boolean(valor),
  );
  return partes.length > 0 ? partes.join(", ") : null;
}

export async function listarAvisosFitosanitariosOficiales(
  filtros: { cropId?: string; province?: string } = {},
): Promise<AvisoFitosanitarioOficial[]> {
  const [alertas, oficiales, cultivos] = await Promise.all([
    listarAlertasFitosanitarias(filtros),
    listarAvisosOficiales(),
    listarCultivosPlataforma(),
  ]);

  const nombreCultivo = new Map(cultivos.map((c) => [c.id, c.nameEs]));
  const vistos = new Set<string>();
  const salida: AvisoFitosanitarioOficial[] = [];

  // Avisos fitosanitarios ricos (ya normalizados, ligados a cultivo/zona).
  for (const alerta of alertas) {
    const clave = `${alerta.provider}:${alerta.externalId ?? alerta.id}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({
      id: alerta.id,
      origen: "oficial",
      provider: alerta.provider,
      externalId: alerta.externalId ?? null,
      fecha: alerta.publishedAt,
      cultivo: alerta.cropId ? (nombreCultivo.get(alerta.cropId) ?? null) : null,
      zona: zonaDe(alerta.municipality ?? null, alerta.province ?? null),
      titulo: alerta.title,
      resumen: alerta.summary,
      enlace: alerta.sourceUrl ?? null,
      severidad: alerta.severity ?? null,
    });
  }

  // Avisos oficiales de RAIF persistidos en `official_alerts`.
  for (const aviso of oficiales) {
    if (aviso.provider !== "raif") continue;
    const clave = `${aviso.provider}:${aviso.id}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({
      id: aviso.id,
      origen: "oficial",
      provider: aviso.provider,
      externalId: aviso.id,
      fecha: aviso.startsAt,
      cultivo: null,
      zona: aviso.area || null,
      titulo: aviso.phenomenon || aviso.headline,
      resumen: aviso.description ?? aviso.headline,
      enlace: aviso.sourceUrl ?? null,
      severidad: aviso.severity,
    });
  }

  return salida.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
