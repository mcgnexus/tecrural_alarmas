import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { obtenerDb } from "@/lib/datos/db";
import { crearCuentaConInvitacion } from "@/lib/aplicacion/cuentas";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.admin.users");
export const dynamic = "force-dynamic";

/** Lista de usuarios con su score de lead. */
export async function GET(req: Request) {
  const auth = await verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return conRequestId({ external_source: "admin" }, async (requestId) => {
    try {
      const db = obtenerDb();
      const r = await db.execute(sql`SELECT u.id, u.name, u.email, u.phone, u.marketing_consent, u.privacy_version, u.consent_version, u.consent_timestamp, u.created_at, COALESCE(ls.score,0) as score, ls.classification, (SELECT count(*)::int FROM campo.parcelas p WHERE p.user_id = u.id) as parcelas, (SELECT count(*)::int FROM public.leads l WHERE l.user_id = u.id) as consultas FROM plataforma.users u LEFT JOIN plataforma.lead_scores ls ON ls.user_id=u.id ORDER BY u.created_at DESC LIMIT 100`);
      return conCabeceraRequestId(NextResponse.json({ users: r.rows }), requestId);
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
