import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { sqlClasificarLead } from "@/lib/datos/clasificacion-lead";

const log = crearLogger("api.admin.suscritos");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return conRequestId({ external_source: "admin" }, async (requestId) => {
    const inicio = Date.now();
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
    const offset = Number(url.searchParams.get("offset") ?? "0");

    try {
      const db = obtenerDb();

      const filtroBusqueda = q
        ? sql`AND (
            u.name ILIKE ${`%${q}%`} OR u.email ILIKE ${`%${q}%`} OR u.phone ILIKE ${`%${q}%`} 
            OR EXISTS (SELECT 1 FROM plataforma.farms f WHERE f.user_id = u.id AND f.municipality ILIKE ${`%${q}%`})
          )`
        : sql``;

      const filtroBusquedaAnon = q
        ? sql`AND (l.contact_name ILIKE ${`%${q}%`} OR l.contact_phone ILIKE ${`%${q}%`} OR l.notes::text ILIKE ${`%${q}%`})`
        : sql``;

      const query = sql`
        WITH user_stats AS (
          SELECT
            u.id::text as id,
            u.name as nombre,
            u.email as email,
            u.phone as telefono,
            u.marketing_consent as marketing_consent,
            u.privacy_version,
            u.consent_version,
            u.consent_timestamp,
            u.created_at as creado_en,
            COALESCE(ls.score, 0) as score,
            ${sql.raw(sqlClasificarLead("COALESCE(ls.score, 0)"))} as clasificacion,
            ls.last_activity_at as ultima_actividad,
            (SELECT COUNT(*)::int FROM plataforma.plots p2 WHERE p2.farm_id IN (SELECT id FROM plataforma.farms f2 WHERE f2.user_id = u.id)) as parcelas,
            (SELECT json_agg(DISTINCT c.name_es) FROM plataforma.plots p3 JOIN plataforma.crops c ON c.id = p3.crop_id JOIN plataforma.farms f3 ON f3.id = p3.farm_id WHERE f3.user_id = u.id) as cultivos,
            (SELECT f.municipality FROM plataforma.farms f WHERE f.user_id = u.id ORDER BY f.created_at LIMIT 1) as municipio,
            (SELECT json_agg(json_build_object('tipo', le.event_type, 'fecha', le.created_at, 'puntos', le.points) ORDER BY le.created_at DESC) FROM (SELECT * FROM plataforma.lead_events le WHERE le.user_id = u.id ORDER BY le.created_at DESC LIMIT 10) le) as eventos_recientes,
            (SELECT COUNT(*)::int FROM plataforma.lead_events le WHERE le.user_id = u.id) as total_eventos,
            (SELECT COUNT(*)::int FROM plataforma.notifications n WHERE n.user_id = u.id) as notificaciones,
            (SELECT COUNT(*)::int FROM plataforma.risk_events re WHERE re.plot_id IN (SELECT p.id FROM plataforma.plots p JOIN plataforma.farms f ON f.id = p.farm_id WHERE f.user_id = u.id)) as alertas_generadas,
            (SELECT json_build_object('pushEnabled', np.push_enabled, 'emailEnabled', np.email_enabled, 'whatsappEnabled', np.whatsapp_enabled, 'telegramEnabled', np.telegram_enabled) FROM plataforma.notification_preferences np WHERE np.user_id = u.id LIMIT 1) as preferencias,
            'usuario' as origen
          FROM plataforma.users u
          LEFT JOIN plataforma.lead_scores ls ON ls.user_id = u.id
          WHERE 1=1 ${filtroBusqueda}
        ),
        anon_stats AS (
          SELECT
            l.id::text as id,
            l.contact_name as nombre,
            NULL::text as email,
            l.contact_phone as telefono,
            NULL::boolean as marketing_consent,
            NULL::text as privacy_version,
            (CASE WHEN l.notes LIKE '{%' THEN l.notes::jsonb ELSE NULL END ->> 'consentVersion') as consent_version,
            (CASE WHEN l.notes LIKE '{%' THEN l.notes::jsonb ELSE NULL END ->> 'consentAcceptedAt')::timestamptz as consent_timestamp,
            l.created_at as creado_en,
            COALESCE(l.score, 0) as score,
            ${sql.raw(sqlClasificarLead("l.score"))} as clasificacion,
            l.last_event_at as ultima_actividad,
            0 as parcelas,
            NULL::json as cultivos,
            (CASE WHEN l.notes LIKE '{%' THEN l.notes::jsonb ELSE NULL END ->> 'municipio') as municipio,
            (SELECT json_agg(json_build_object('tipo', le.type, 'fecha', le.created_at, 'puntos', le.weight) ORDER BY le.created_at DESC) FROM (SELECT * FROM public.lead_events le WHERE le.lead_id = l.id ORDER BY le.created_at DESC LIMIT 10) le) as eventos_recientes,
            (SELECT COUNT(*)::int FROM public.lead_events le WHERE le.lead_id = l.id) as total_eventos,
            0 as notificaciones,
            0 as alertas_generadas,
            NULL::json as preferencias,
            'contacto' as origen
          FROM public.leads l
          WHERE l.merged_into_lead_id IS NULL AND l.user_id IS NULL AND COALESCE(l.contact_phone, '') <> '' ${filtroBusquedaAnon}
        ),
        todos AS (
          SELECT * FROM user_stats
          UNION ALL
          SELECT * FROM anon_stats
        )
        SELECT * FROM todos ORDER BY ultima_actividad DESC NULLS LAST, score DESC LIMIT ${limit} OFFSET ${offset}
      `;

      const result = await db.execute(query);
      const rows = result.rows as Record<string, unknown>[];

      log.info("admin.suscritos.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { total: rows.length, q } });
      return conCabeceraRequestId(NextResponse.json({ suscritos: rows, total: rows.length }), requestId);
    } catch (e) {
      log.error("admin.suscritos.error", { status: 503, duracion_ms: Date.now() - inicio }, e);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo obtener suscritos." }, { status: 503 }), requestId);
    }
  });
}
