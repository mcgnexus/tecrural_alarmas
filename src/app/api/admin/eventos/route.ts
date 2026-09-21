import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.admin.eventos");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return conRequestId({ external_source: "admin" }, async (requestId) => {
    try {
      const db = obtenerDb();
      const r = await db.execute(sql`SELECT le.id, le.event_type, le.points, le.created_at, le.anonymous_id, u.name as usuario, u.email FROM plataforma.lead_events le LEFT JOIN plataforma.users u ON u.id=le.user_id ORDER BY le.created_at DESC LIMIT 100`);
      return conCabeceraRequestId(NextResponse.json({ eventos: r.rows }), requestId);
    } catch (e) {
      log.error("admin.eventos.error", {}, e);
      return conCabeceraRequestId(NextResponse.json({ error: "Error" }, { status: 503 }), requestId);
    }
  });
}
