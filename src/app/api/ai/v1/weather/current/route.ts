import { NextResponse } from "next/server";
import { obtenerClimaHorario } from "@/lib/clima/motor";
import { horaMasCercana } from "@/lib/normalizacion/horario";
import { autenticarAgente, respuestaNoAutorizada } from "@/lib/ia/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const acceso = autenticarAgente(req);
  if (!acceso.ok) return respuestaNoAutorizada(acceso);
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const municipio = url.searchParams.get("aemetMunicipio")?.trim() || undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Coordenadas no válidas." }, { status: 400 });
  }
  try {
    return NextResponse.json(horaMasCercana(await obtenerClimaHorario(lat, lon, municipio)));
  } catch {
    return NextResponse.json({ error: "No se pudo obtener el clima." }, { status: 503 });
  }
}
