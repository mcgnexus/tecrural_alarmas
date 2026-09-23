import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { obtenerDb } from "@/lib/datos/db";
import { crearCuentaConInvitacion } from "@/lib/aplicacion/cuentas";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { PLAN_FEATURES, type Plan } from "@/lib/planes/permisos";

const log = crearLogger("api.admin.users");
export const dynamic = "force-dynamic";

/** Lista de usuarios con su score de lead. */
export async function GET(req: Request) {
  const auth = await verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return conRequestId({ external_source: "admin" }, async (requestId) => {
    try {
      const db = obtenerDb();
      const [r, solicitudes] = await Promise.all([
        db.execute(sql`SELECT u.id, u.name, u.email, u.phone, u.subscription_plan as plan, u.marketing_consent, u.privacy_version, u.consent_version, u.consent_timestamp, u.created_at, COALESCE(ls.score,0) as score, ls.classification, (SELECT count(*)::int FROM campo.parcelas p WHERE p.user_id = u.id) as parcelas, (SELECT count(*)::int FROM public.leads l WHERE l.user_id = u.id) as consultas FROM plataforma.users u LEFT JOIN plataforma.lead_scores ls ON ls.user_id=u.id ORDER BY u.created_at DESC LIMIT 200`),
        db.execute(sql`SELECT id, contact_name as nombre, contact_phone as telefono, created_at as creado_en, comment as comentario, (CASE WHEN notes LIKE '{%' THEN notes::jsonb ELSE NULL END ->> 'municipio') as municipio, (CASE WHEN notes LIKE '{%' THEN notes::jsonb ELSE NULL END ->> 'cultivo') as cultivo FROM public.leads WHERE user_id IS NULL AND merged_into_lead_id IS NULL AND COALESCE(contact_phone, '') <> '' ORDER BY created_at DESC LIMIT 200`),
      ]);
      return conCabeceraRequestId(NextResponse.json({ users: r.rows, solicitudes: solicitudes.rows, planes: Object.keys(PLAN_FEATURES) }), requestId);
    } catch (e) {
      log.error("admin.users.error", {}, e);
      return conCabeceraRequestId(NextResponse.json({ error: "Error" }, { status: 503 }), requestId);
    }
  });
}

const esquemaCrear = z.object({
  nombre: z.string().trim().min(2).max(80),
  telefono: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  marketingConsent: z.boolean().optional(),
  consentVersion: z.string().trim().max(40).optional(),
  plan: z.enum(["free", "essential", "monitor", "pro", "cooperative"]).optional(),
});

/**
 * Alta manual de una cuenta: crea el usuario y devuelve una invitación de un
 * solo uso (token) para que se la envíes por WhatsApp.
 */
export async function POST(req: Request) {
  const auth = await verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const cuerpo = (await req.json().catch(() => null)) as unknown;
  const parsed = esquemaCrear.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }
  const datos = parsed.data;

  return conRequestId({ external_source: "admin" }, async (requestId) => {
    try {
      const { usuarioId, token, expiresAt } = await crearCuentaConInvitacion({
        nombre: datos.nombre,
        telefono: datos.telefono ?? null,
        email: datos.email ? datos.email : null,
        marketingConsent: datos.marketingConsent ?? false,
        consentVersion: datos.consentVersion ?? null,
        subscriptionPlan: (datos.plan ?? "free") as Plan,
      });
      log.info("admin.users.crear.ok", { user_id: usuarioId });
      return conCabeceraRequestId(
        NextResponse.json(
          {
            usuarioId,
            invitacion: {
              token,
              expiresAt: expiresAt.toISOString(),
              ruta: `/acceso?token=${encodeURIComponent(token)}`,
            },
          },
          { status: 201 },
        ),
        requestId,
      );
    } catch (e) {
      log.error("admin.users.crear.error", {}, e);
      return conCabeceraRequestId(
        NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 503 }),
        requestId,
      );
    }
  });
}
