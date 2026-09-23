import { NextResponse } from "next/server";
import { crearLogger } from "@/lib/log/logger";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { MUNICIPIOS_PUBLICOS } from "@/lib/datos/municipios-publicos";

const log = crearLogger("api.v1.locations.search");

export const dynamic = "force-dynamic";

type Municipio = { name: string; slug: string; region: string; province: string; latitude: number; longitude: number; zona: string; aemetMunicipio?: string };

const ALTIPLANO: Municipio[] = MUNICIPIOS_PUBLICOS.filter((municipio) => municipio.zona === "altiplano");
const COSTA: Municipio[] = MUNICIPIOS_PUBLICOS.filter((municipio) => municipio.zona === "costa");

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
