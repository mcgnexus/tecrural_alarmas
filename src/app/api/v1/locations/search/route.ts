import { NextResponse } from "next/server";
import { crearLogger } from "@/lib/log/logger";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";

const log = crearLogger("api.v1.locations.search");

export const dynamic = "force-dynamic";

type Municipio = { name: string; slug: string; region: string; province: string; latitude: number; longitude: number; zona: string; aemetMunicipio?: string };

const ALTIPLANO: Municipio[] = [
  { name: "Huéscar", slug: "huescar", region: "Altiplano de Granada", province: "Granada", latitude: 37.8106, longitude: -2.5412, zona: "altiplano", aemetMunicipio: "18098" },
  { name: "Baza", slug: "baza", region: "Altiplano de Granada", province: "Granada", latitude: 37.4897, longitude: -2.7735, zona: "altiplano", aemetMunicipio: "18023" },
  { name: "Puebla de Don Fadrique", slug: "puebla-de-don-fadrique", region: "Altiplano de Granada", province: "Granada", latitude: 37.9587, longitude: -2.4354, zona: "altiplano", aemetMunicipio: "18164" },
  { name: "Castril", slug: "castril", region: "Altiplano de Granada", province: "Granada", latitude: 37.7969, longitude: -2.9415, zona: "altiplano", aemetMunicipio: "18046" },
  { name: "Orce", slug: "orce", region: "Altiplano de Granada", province: "Granada", latitude: 37.6425, longitude: -2.4788, zona: "altiplano", aemetMunicipio: "18145" },
  { name: "Galera", slug: "galera", region: "Altiplano de Granada", province: "Granada", latitude: 37.6833, longitude: -2.55, zona: "altiplano", aemetMunicipio: "18077" },
  { name: "Cúllar", slug: "cullar", region: "Altiplano de Granada", province: "Granada", latitude: 37.5833, longitude: -2.4744, zona: "altiplano", aemetMunicipio: "18057" },
];

const COSTA: Municipio[] = [
  { name: "Almuñécar", slug: "almunecar", region: "Costa Tropical", province: "Granada", latitude: 36.7352, longitude: -3.6916, zona: "costa", aemetMunicipio: "18017" },
  { name: "La Herradura", slug: "la-herradura", region: "Costa Tropical", province: "Granada", latitude: 36.6206, longitude: -3.7348, zona: "costa", aemetMunicipio: "18017" },
  { name: "Salobreña", slug: "salobrena", region: "Costa Tropical", province: "Granada", latitude: 36.7447, longitude: -3.5849, zona: "costa", aemetMunicipio: "18173" },
  { name: "Motril", slug: "motril", region: "Costa Tropical", province: "Granada", latitude: 36.7448, longitude: -3.3426, zona: "costa", aemetMunicipio: "18140" },
];

const TODOS = [...ALTIPLANO, ...COSTA];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const zona = url.searchParams.get("zona")?.trim().toLowerCase() ?? url.searchParams.get("zone")?.trim().toLowerCase() ?? "";

  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    const zonasValidas = ["altiplano", "costa"];
    const zonaEsValida = zonasValidas.includes(zona);
    // Si se pide zona sin q, devolver todos de esa zona
    if (zona && zonaEsValida) {
      const lista = zona === "altiplano" ? ALTIPLANO : COSTA;
      const filtrada = q.length >= 2 ? lista.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()) || m.slug.includes(q.toLowerCase())) : lista;
      log.info("v1.locations.search.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { q, zona, total: filtrada.length } });
      return conCabeceraRequestId(NextResponse.json(filtrada), requestId);
    }

    if (q.length < 2 && !zona) {
      return NextResponse.json({ error: "Indica al menos 2 caracteres o elige zona." }, { status: 400 });
    }
    if (zona && !zonaEsValida) {
      return NextResponse.json({ error: "Zona desconocida." }, { status: 400 });
    }

    // Intentar DB primero, con fallback a estáticos
    try {
      const connStr = process.env.DATABASE_URL;
      if (connStr) {
        const pg = (await import("pg")).default;
        const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
        await client.connect();
        try {
          const r = await client.query(
            `SELECT name, slug, region, province, latitude, longitude, 'altiplano' as zona FROM public.municipalities WHERE active = true AND (name ILIKE $1 OR slug ILIKE $1) ORDER BY name LIMIT 20`,
            [`%${q}%`],
          );
          if (r.rows.length > 0) {
            log.info("v1.locations.search.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { q, total: r.rows.length } });
            return conCabeceraRequestId(NextResponse.json(r.rows), requestId);
          }
        } finally {
          await client.end();
        }
      }
    } catch (error) {
      log.warn("v1.locations.search.db.error", {}, error);
    }

    // Fallback estático
    const filtrados = TODOS.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()) || m.slug.includes(q.toLowerCase()));
    log.info("v1.locations.search.fallback", { status: 200, duracion_ms: Date.now() - inicio, data: { q, total: filtrados.length } });
    return conCabeceraRequestId(NextResponse.json(filtrados), requestId);
  });
}
