import { eq } from "drizzle-orm";
import { obtenerDb } from "./db";
import { cultivos, parcelasPlataforma } from "./plataforma-schema";

export interface PlotConCultivo {
  plotId: string;
  farmId: string;
  nombre: string;
  latitud: number | null;
  longitud: number | null;
  cropId: string;
  cropSlug: string;
  cropNombre: string;
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
    })
    .from(parcelasPlataforma)
    .innerJoin(cultivos, eq(parcelasPlataforma.cropId, cultivos.id))
    .where(eq(parcelasPlataforma.id, plotId))
    .limit(1);
  return fila ?? null;
}
