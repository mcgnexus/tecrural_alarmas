import { NextResponse } from "next/server";
import { autenticarAgente, respuestaNoAutorizada } from "@/lib/ia/auth";

const MUNICIPIOS = [
  ["Huéscar", "Altiplano de Granada"], ["Baza", "Altiplano de Granada"], ["Puebla de Don Fadrique", "Altiplano de Granada"],
  ["Castril", "Altiplano de Granada"], ["Orce", "Altiplano de Granada"], ["Galera", "Altiplano de Granada"], ["Cúllar", "Altiplano de Granada"],
  ["Almuñécar", "Costa Tropical"], ["La Herradura", "Costa Tropical"], ["Salobreña", "Costa Tropical"], ["Motril", "Costa Tropical"],
] as const;

export function GET(req: Request) {
  const acceso = autenticarAgente(req);
  if (!acceso.ok) return respuestaNoAutorizada(acceso);
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLocaleLowerCase("es");
  const region = (url.searchParams.get("region") ?? "").trim().toLocaleLowerCase("es");
  if (q.length < 2 && !region) return NextResponse.json({ error: "Indica q o region." }, { status: 400 });
  const resultados = MUNICIPIOS.filter(([name, area]) => (!q || name.toLocaleLowerCase("es").includes(q)) && (!region || area.toLocaleLowerCase("es").includes(region))).map(([name, area]) => ({ name, region: area }));
  return NextResponse.json({ municipios: resultados, total: resultados.length });
}
