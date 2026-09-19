import { NextResponse } from "next/server";
import { crearLogger } from "@/lib/log/logger";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";

const log = crearLogger("api.v1.locations.search");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json(
      { error: "Indica al menos 2 caracteres." },
      { status: 400 },
    );
  }

  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const pg = (await import("pg")).default;
      const { readFileSync } = await import("node:fs");
      const envRaw = readFileSync("./.env.local", "utf8");
      const env: Record<string, string> = {};
      for (const linea of envRaw.split(/\r?\n/)) {
        const limpia = linea.trim();
        if (!limpia || limpia.startsWith("#")) continue;
        const indice = limpia.indexOf("=");
        if (indice === -1) continue;
        env[limpia.slice(0, indice).trim()] = limpia.slice(indice + 1).trim();
      }
      const client = new pg.Client({
        connectionString: env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      let resultados: unknown[] = [];
      try {
        const r = await client.query(
          `SELECT name, slug, region, province, latitude, longitude
           FROM public.municipalities WHERE active = true
             AND (name ILIKE $1 OR slug ILIKE $1)
           ORDER BY name LIMIT 20`,
          [`%${q}%`],
        );
        resultados = r.rows;
      } finally {
        await client.end();
      }
      log.info("v1.locations.search.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { q, total: resultados.length },
      });
      return conCabeceraRequestId(NextResponse.json(resultados), requestId);
    } catch (error) {
      log.error(
        "v1.locations.search.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json({ error: "No se pudo buscar." }, { status: 503 }),
        requestId,
      );
    }
  });
}
