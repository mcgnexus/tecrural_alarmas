import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.admin.parcelas");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return conRequestId({ external_source: "admin" }, async (requestId) => {
    try {
      const db = obtenerDb();
      const r = await db.execute(sql`SELECT p.id, p.name, p.latitude, p.longitude, c.name_es as cultivo, f.municipality as municipio, u.name as usuario, u.email FROM plataforma.plots p JOIN plataforma.crops c ON c.id=p.crop_id JOIN plataforma.farms f ON f.id=p.farm_id JOIN plataforma.users u ON u.id=f.user_id ORDER BY p.created_at DESC LIMIT 100`);
      return conCabeceraRequestId(NextResponse.json({ parcelas: r.rows }), requestId);
    } catch (e) {
      log.error("admin.parcelas.error", {}, e);
      return conCabeceraRequestId(NextResponse.json({ error: "Error" }, { status: 503 }), requestId);
    }
  });
}
