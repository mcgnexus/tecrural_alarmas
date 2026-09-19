import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.admin.users");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return conRequestId({ external_source: "admin" }, async (requestId) => {
    try {
      const db = obtenerDb();
      const r = await db.execute(sql`SELECT u.id, u.name, u.email, u.phone, u.marketing_consent, u.privacy_version, u.consent_version, u.consent_timestamp, u.created_at, COALESCE(ls.score,0) as score, ls.classification FROM plataforma.users u LEFT JOIN plataforma.lead_scores ls ON ls.user_id=u.id ORDER BY u.created_at DESC LIMIT 100`);
      return conCabeceraRequestId(NextResponse.json({ users: r.rows }), requestId);
    } catch (e) {
      log.error("admin.users.error", {}, e);
      return conCabeceraRequestId(NextResponse.json({ error: "Error" }, { status: 503 }), requestId);
    }
  });
}
