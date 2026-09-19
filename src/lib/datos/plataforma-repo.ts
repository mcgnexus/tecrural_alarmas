import { eq } from "drizzle-orm";
import { obtenerDb } from "./db";
import {
  cultivos,
  estadosFenologicos,
  parcelasPlataforma,
} from "./plataforma-schema";

export interface PlotConCultivo {
  plotId: string;
  farmId: string;
  nombre: string;
  latitud: number | null;
  longitud: number | null;
  cropId: string;
  cropSlug: string;
  cropNombre: string;
  phenologicalStateId: string | null;
  cropKc: number | null;
  cropKcValidated: boolean;
  stateKc: number | null;
  stateKcValidated: boolean;
  coldSensitivity: number | null;
  heatSensitivity: number | null;
  waterSensitivity: number | null;
}

function aNumero(valor: string | number | null): number | null {
  if (valor === null) return null;
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export async function obtenerPlotConCultivo(
  plotId: string,
): Promise<PlotConCultivo | null> {
  const db = obtenerDb();
  const [fila] = await db
    .select({
      plotId: parcelasPlataforma.id,
      farmId: parcelasPlataforma.farmId,
      nombre: parcelasPlataforma.name,
      latitud: parcelasPlataforma.latitude,
      longitud: parcelasPlataforma.longitude,
      cropId: cultivos.id,
      cropSlug: cultivos.slug,
      cropNombre: cultivos.nameEs,
      phenologicalStateId: parcelasPlataforma.phenologicalStateId,
      cropKc: cultivos.kc,
      cropKcValidated: cultivos.kcValidated,
      stateKc: estadosFenologicos.kc,
      stateKcValidated: estadosFenologicos.kcValidated,
      coldSensitivity: estadosFenologicos.coldSensitivity,
      heatSensitivity: estadosFenologicos.heatSensitivity,
      waterSensitivity: estadosFenologicos.waterSensitivity,
    })
    .from(parcelasPlataforma)
    .innerJoin(cultivos, eq(parcelasPlataforma.cropId, cultivos.id))
    .leftJoin(
      estadosFenologicos,
      eq(parcelasPlataforma.phenologicalStateId, estadosFenologicos.id),
    )
    .where(eq(parcelasPlataforma.id, plotId))
    .limit(1);

  if (!fila) return null;
  return {
    ...fila,
    stateKcValidated: fila.stateKcValidated ?? false,
    cropKc: aNumero(fila.cropKc),
    stateKc: aNumero(fila.stateKc),
    coldSensitivity: aNumero(fila.coldSensitivity),
    heatSensitivity: aNumero(fila.heatSensitivity),
    waterSensitivity: aNumero(fila.waterSensitivity),
  };
}
