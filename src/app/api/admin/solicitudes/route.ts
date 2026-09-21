import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.admin.solicitudes");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return conRequestId({ external_source: "admin" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const db = obtenerDb();
      // Las solicitudes comerciales reales viven en el CRM (`public.leads`),
      // con el contacto telefónico y los datos estructurados en `notes`.
      const r = await db.execute(sql`
        SELECT
          l.id,
          l.contact_name AS nombre,
          l.contact_phone AS telefono,
          l.score,
          l.status,
          l.source,
          l.created_at,
          (CASE WHEN l.notes LIKE '{%' THEN l.notes::jsonb ELSE NULL END ->> 'municipio') AS municipio,
          (CASE WHEN l.notes LIKE '{%' THEN l.notes::jsonb ELSE NULL END ->> 'servicioNombre') AS servicio,
          (CASE WHEN l.notes LIKE '{%' THEN l.notes::jsonb ELSE NULL END ->> 'problema') AS problema,
          (CASE WHEN l.notes LIKE '{%' THEN l.notes::jsonb ELSE NULL END ->> 'tipoExplotacion') AS tipo_explotacion
        FROM public.leads l
        WHERE l.merged_into_lead_id IS NULL
          AND COALESCE(l.contact_phone, '') <> ''
        ORDER BY l.created_at DESC
        LIMIT 100
      `);
      log.info("admin.solicitudes.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { total: r.rows.length } });
      return conCabeceraRequestId(NextResponse.json({ solicitudes: r.rows }), requestId);
    } catch (e) {
      log.error("admin.solicitudes.error", {}, e);
      return conCabeceraRequestId(NextResponse.json({ error: "Error" }, { status: 503 }), requestId);
    }
  });
}
