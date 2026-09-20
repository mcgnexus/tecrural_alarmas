import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.admin.stats");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return conRequestId({ external_source: "admin" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const db = obtenerDb();

      const q = async (texto: string, params: unknown[] = []) => {
        try {
          const r = await (db as unknown as { execute: (q: unknown) => Promise<{ rows: unknown[] }> }).execute(sql.raw(texto));
          return r.rows;
        } catch {
          return [];
        }
      };

      // Usuarios
      const usuariosRows = await db.execute(sql`SELECT COUNT(*)::int as c FROM plataforma.users`);
      const usuarios = Number((usuariosRows.rows[0] as { c: number })?.c ?? 0);

      const parcelasRows = await db.execute(sql`SELECT COUNT(*)::int as c FROM plataforma.plots`);
      const parcelas = Number((parcelasRows.rows[0] as { c: number })?.c ?? 0);

      const activos7Rows = await db.execute(sql`SELECT COUNT(DISTINCT user_id)::int as c FROM plataforma.lead_events WHERE user_id IS NOT NULL AND created_at > NOW() - INTERVAL '7 days'`);
      const activos7 = Number((activos7Rows.rows[0] as { c: number })?.c ?? 0);

      const activos30Rows = await db.execute(sql`SELECT COUNT(DISTINCT user_id)::int as c FROM plataforma.lead_events WHERE user_id IS NOT NULL AND created_at > NOW() - INTERVAL '30 days'`);
      const activos30 = Number((activos30Rows.rows[0] as { c: number })?.c ?? 0);

      const leadsFriosRows = await db.execute(sql`SELECT COUNT(*)::int as c FROM plataforma.lead_scores WHERE classification IN ('frio','lead frío','frío')`);
      const leadsTempladosRows = await db.execute(sql`SELECT COUNT(*)::int as c FROM plataforma.lead_scores WHERE classification IN ('templado','lead templado')`);
      const leadsCalientesRows = await db.execute(sql`SELECT COUNT(*)::int as c FROM plataforma.lead_scores WHERE classification IN ('caliente','lead caliente')`);
      const leadsFrios = Number((leadsFriosRows.rows[0] as { c: number })?.c ?? 0);
      const leadsTemplados = Number((leadsTempladosRows.rows[0] as { c: number })?.c ?? 0);
      const leadsCalientes = Number((leadsCalientesRows.rows[0] as { c: number })?.c ?? 0);

      // Las solicitudes de contacto llegan al CRM (public.leads, con contacto
      // telefonico). La tabla plataforma.commercial_contact_requests no la
      // escribe nadie, asi que contarla devolvia siempre 0.
      const solicitudesRows = await db.execute(sql`SELECT COUNT(*)::int as c FROM public.leads WHERE contact_phone IS NOT NULL AND contact_phone <> ''`);
      const solicitudes = Number((solicitudesRows.rows[0] as { c: number })?.c ?? 0);

      const alertasRows = await db.execute(sql`SELECT risk_type as tipo, COUNT(*)::int as total FROM plataforma.risk_events GROUP BY risk_type ORDER BY total DESC LIMIT 5`);
      const alertas = (alertasRows.rows as { tipo: string; total: number }[]) ?? [];

      const cultivosRows = await db.execute(sql`SELECT c.name_es as nombre, COUNT(*)::int as total FROM plataforma.plots p JOIN plataforma.crops c ON c.id = p.crop_id GROUP BY c.name_es ORDER BY total DESC`);
      const cultivos = (cultivosRows.rows as { nombre: string; total: number }[]) ?? [];

      const municipiosRows = await db.execute(sql`SELECT municipality as nombre, COUNT(*)::int as total FROM plataforma.farms WHERE municipality IS NOT NULL AND municipality <> '' GROUP BY municipality ORDER BY total DESC LIMIT 10`);
      const municipios = (municipiosRows.rows as { nombre: string; total: number }[]) ?? [];

      const ctasRows = await db.execute(sql`SELECT event_type as tipo, COUNT(*)::int as total FROM plataforma.lead_events WHERE event_type IN ('SENSOR_CTA_CLICKED','SENSOR_CTA_VIEWED','IRRIGATION_CTA_CLICKED','CONTACT_REQUESTED','QUOTE_REQUESTED','ALERTS_ENABLED') GROUP BY event_type ORDER BY total DESC`);
      const ctas = (ctasRows.rows as { tipo: string; total: number }[]) ?? [];

      const stats = {
        usuarios,
        parcelas,
        activos7,
        activos30,
        leads: { frios: leadsFrios, templados: leadsTemplados, calientes: leadsCalientes },
        solicitudes,
        alertas,
        cultivos,
        municipios,
        ctas,
      };

      log.info("admin.stats.ok", { status: 200, duracion_ms: Date.now() - inicio, data: stats as unknown as Record<string, unknown> });
      return conCabeceraRequestId(NextResponse.json(stats), requestId);
    } catch (e) {
      log.error("admin.stats.error", { status: 503, duracion_ms: Date.now() - inicio }, e);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo obtener stats." }, { status: 503 }), requestId);
    }
  });
}
