import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.admin.riesgos");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return conRequestId({ external_source: "admin" }, async (requestId) => {
    try {
      const db = obtenerDb();
      const r = await db.execute(sql`SELECT re.id, re.risk_type, re.level, re.score, re.headline, re.created_at, p.name as parcela, u.name as usuario FROM plataforma.risk_events re JOIN plataforma.plots p ON p.id=re.plot_id JOIN plataforma.farms f ON f.id=p.farm_id JOIN plataforma.users u ON u.id=f.user_id ORDER BY re.created_at DESC LIMIT 100`);
      return conCabeceraRequestId(NextResponse.json({ riesgos: r.rows }), requestId);
    } catch (e) {
      log.error("admin.riesgos.error", {}, e);
      return conCabeceraRequestId(NextResponse.json({ error: "Error" }, { status: 503 }), requestId);
    }
  });
}
