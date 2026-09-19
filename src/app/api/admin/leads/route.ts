import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.admin.leads");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return conRequestId({ external_source: "admin" }, async (requestId) => {
    const inicio = Date.now();
    const url = new URL(req.url);
    const municipio = url.searchParams.get("municipio")?.trim() ?? "";
    const cultivo = url.searchParams.get("cultivo")?.trim() ?? "";
    const scoreMin = url.searchParams.get("scoreMin") ? Number(url.searchParams.get("scoreMin")) : null;
    const scoreMax = url.searchParams.get("scoreMax") ? Number(url.searchParams.get("scoreMax")) : null;
    const servicio = url.searchParams.get("servicio")?.trim() ?? "";
    const ultimaActividadDesde = url.searchParams.get("desde")?.trim() ?? "";
    const ultimaActividadHasta = url.searchParams.get("hasta")?.trim() ?? "";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
    const offset = Number(url.searchParams.get("offset") ?? "0");

    try {
      const db = obtenerDb();

      // Filtros en SQL antes de LIMIT para no perder resultados
      const conditions: ReturnType<typeof sql>[] = [];
      if (municipio) conditions.push(sql`municipio ILIKE ${`%${municipio}%`}`);
      if (cultivo) conditions.push(sql`(cultivo_principal ILIKE ${`%${cultivo}%`} OR COALESCE(cultivos::text,'') ILIKE ${`%${cultivo}%`})`);
      if (scoreMin !== null && Number.isFinite(scoreMin)) conditions.push(sql`score >= ${scoreMin}`);
      if (scoreMax !== null && Number.isFinite(scoreMax)) conditions.push(sql`score <= ${scoreMax}`);
      if (servicio) conditions.push(sql`servicio_reciente ILIKE ${`%${servicio}%`}`);
      if (ultimaActividadDesde) {
        const d = new Date(ultimaActividadDesde);
        if (!isNaN(d.getTime())) conditions.push(sql`ultima_actividad >= ${d.toISOString()}::timestamptz`);
      }
      if (ultimaActividadHasta) {
        const d = new Date(ultimaActividadHasta);
        if (!isNaN(d.getTime())) conditions.push(sql`ultima_actividad <= ${d.toISOString()}::timestamptz`);
      }
      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

      const query = sql`
        WITH user_stats AS (
          SELECT
            u.id as user_id,
            u.name as nombre,
            u.email as email,
            u.phone as phone,
            u.marketing_consent,
            u.consent_version,
            u.consent_timestamp,
            COALESCE(ls.score, 0) as score,
            COALESCE(ls.classification, 'usuario') as clasificacion,
            ls.last_activity_at as ultima_actividad,
            (SELECT COUNT(*)::int FROM plataforma.plots p2 WHERE p2.farm_id IN (SELECT id FROM plataforma.farms f2 WHERE f2.user_id = u.id)) as parcelas,
            (SELECT json_agg(DISTINCT c.name_es) FROM plataforma.plots p3 JOIN plataforma.crops c ON c.id = p3.crop_id JOIN plataforma.farms f3 ON f3.id = p3.farm_id WHERE f3.user_id = u.id) as cultivos,
            (SELECT f.municipality FROM plataforma.farms f WHERE f.user_id = u.id ORDER BY f.created_at LIMIT 1) as municipio,
            (SELECT c.name_es FROM plataforma.plots p4 JOIN plataforma.crops c ON c.id = p4.crop_id JOIN plataforma.farms f4 ON f4.id = p4.farm_id WHERE f4.user_id = u.id LIMIT 1) as cultivo_principal,
            (SELECT event_type FROM plataforma.lead_events le2 WHERE le2.user_id = u.id ORDER BY le2.created_at DESC LIMIT 1) as interes,
            (SELECT ccr.service FROM plataforma.commercial_contact_requests ccr WHERE ccr.user_id = u.id ORDER BY ccr.created_at DESC LIMIT 1) as servicio_reciente
          FROM plataforma.users u
          LEFT JOIN plataforma.lead_scores ls ON ls.user_id = u.id
        )
        SELECT * FROM user_stats
        ${whereClause}
        ORDER BY score DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const result = await db.execute(query);
      const rows = result.rows as Record<string, unknown>[];

      const mapped = rows.map((r) => ({
        nombre: r.nombre ?? r.email ?? "—",
        municipio: r.municipio ?? "—",
        cultivo: r.cultivo_principal ?? (Array.isArray(r.cultivos) ? (r.cultivos as string[]).join(", ") : "—"),
        parcelas: r.parcelas ?? 0,
        score: r.score ?? 0,
        clasificacion: r.clasificacion ?? "usuario",
        ultimaActividad: r.ultima_actividad ?? null,
        interes: r.interes ?? "—",
        contacto: r.email ?? r.phone ?? "—",
        consentVersion: r.consent_version ?? null,
        consentTimestamp: r.consent_timestamp ?? null,
      }));

      log.info("admin.leads.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { total: mapped.length } });
      return conCabeceraRequestId(NextResponse.json({ leads: mapped, total: mapped.length }), requestId);
    } catch (e) {
      log.error("admin.leads.error", { status: 503, duracion_ms: Date.now() - inicio }, e);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo obtener leads." }, { status: 503 }), requestId);
    }
  });
}
