import { NextResponse } from "next/server";
import { METADATOS_FUENTE } from "@/lib/proveedores/fuentes";
import { proveedoresDisponibles } from "@/lib/proveedores/registro";

export const dynamic = "force-dynamic";

/**
 * Catálogo público de fuentes de datos: expone nombre, URL, licencia y si el
 * proveedor está configurado en este entorno. Permite a la interfaz comunicar
 * con transparencia qué origen sirvió cada dato.
 */
export async function GET() {
  const config = new Set(proveedoresDisponibles().map((p) => p.id));
  const fuentes = Object.entries(METADATOS_FUENTE).map(([id, m]) => ({
    id,
    nombre: m.nombre,
    url: m.url,
    licencia: m.licencia,
    configurado: config.has(id),
  }));
  return NextResponse.json(fuentes);
}
