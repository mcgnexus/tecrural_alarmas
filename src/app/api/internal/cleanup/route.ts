import { NextResponse } from "next/server";
import { lt, sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { climaHorario, eventosRiesgo, avisosOficiales, notificacionesPlataforma, eventosLead } from "@/lib/datos/plataforma-schema";
import { verificarAccesoInterno } from "@/lib/internal/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.internal.cleanup");
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  const auth = verificarAccesoInterno(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return conRequestId({ external_source: "internal" }, async (requestId) => {
    const inicio = Date.now();
    try {
      let body: unknown = null;
      try { body = await req.clone().json(); } catch { body = null; }
      const b = (body ?? {}) as { dryRun?: boolean; weatherDays?: number; riskDays?: number; leadDays?: number };
      const dryRun = b.dryRun === true;
      const weatherDays = typeof b.weatherDays === "number" ? b.weatherDays : 30;
      const riskDays = typeof b.riskDays === "number" ? b.riskDays : 90;
      const leadDays = typeof b.leadDays === "number" ? b.leadDays : 180;

      const weatherCutoff = new Date(Date.now() - weatherDays * 24 * 60 * 60 * 1000);
      const riskCutoff = new Date(Date.now() - riskDays * 24 * 60 * 60 * 1000);
      const leadCutoff = new Date(Date.now() - leadDays * 24 * 60 * 60 * 1000);

      if (dryRun) {
        const db = obtenerDb();
        const [w] = await db.select({ c: sql<number>`count(*)::int` }).from(climaHorario).where(lt(climaHorario.fetchedAt, weatherCutoff));
        const [r] = await db.select({ c: sql<number>`count(*)::int` }).from(eventosRiesgo).where(lt(eventosRiesgo.createdAt, riskCutoff));
        const [l] = await db.select({ c: sql<number>`count(*)::int` }).from(eventosLead).where(lt(eventosLead.createdAt, leadCutoff));
        const [n] = await db.select({ c: sql<number>`count(*)::int` }).from(notificacionesPlataforma).where(lt(notificacionesPlataforma.scheduledAt, riskCutoff));
        const [a] = await db.select({ c: sql<number>`count(*)::int` }).from(avisosOficiales).where(lt(avisosOficiales.createdAt, riskCutoff));

        const result = { dryRun: true, weatherHourly: w?.c ?? 0, riskEvents: r?.c ?? 0, leadEvents: l?.c ?? 0, notifications: n?.c ?? 0, officialAlerts: a?.c ?? 0 };
        log.info("internal.cleanup.dryRun", { status: 200, duracion_ms: Date.now() - inicio, data: result });
        return conCabeceraRequestId(NextResponse.json(result), requestId);
      }

      const db = obtenerDb();
      const weatherRes = await db.delete(climaHorario).where(lt(climaHorario.fetchedAt, weatherCutoff)).returning({ id: climaHorario.id });
      const riskRes = await db.delete(eventosRiesgo).where(lt(eventosRiesgo.createdAt, riskCutoff)).returning({ id: eventosRiesgo.id });
      // Solo borramos notificaciones enviadas/error antiguas, no las pendientes
      const notifRes = await db
        .delete(notificacionesPlataforma)
        .where(sql`${notificacionesPlataforma.scheduledAt} < ${riskCutoff} and ${notificacionesPlataforma.status} != 'pending'`)
        .returning({ id: notificacionesPlataforma.id });
      const officialRes = await db.delete(avisosOficiales).where(lt(avisosOficiales.createdAt, riskCutoff)).returning({ id: avisosOficiales.id });
      // Lead events se conservan por defecto; solo se borran si se pide explícitamente leadDays < 365
      let leadDeleted = 0;
      if (leadDays < 365) {
        const leadRes = await db.delete(eventosLead).where(lt(eventosLead.createdAt, leadCutoff)).returning({ id: eventosLead.id });
        leadDeleted = leadRes.length;
      }

      const result = {
        weatherHourly: weatherRes.length,
        riskEvents: riskRes.length,
        notifications: notifRes.length,
        officialAlerts: officialRes.length,
        leadEvents: leadDeleted,
      };

      log.info("internal.cleanup.ok", { status: 200, duracion_ms: Date.now() - inicio, data: result });
      return conCabeceraRequestId(NextResponse.json(result), requestId);
    } catch (error) {
      log.error("internal.cleanup.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo ejecutar cleanup." }, { status: 503 }), requestId);
    }
  });
}

export const POST = handler;
