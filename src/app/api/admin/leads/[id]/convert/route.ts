import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { obtenerDb } from "@/lib/datos/db";
import { crearInvitacion } from "@/lib/datos/usuarios-repo";

export const dynamic = "force-dynamic";

const cuerpoSchema = z.object({
  plan: z.enum(["free", "essential", "monitor", "pro", "cooperative"]).default("free"),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = cuerpoSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Plan no válido." }, { status: 400 });
  const { id } = await params;

  try {
    const db = obtenerDb();
    const converted = await db.execute(sql`
      WITH nuevo AS (
        INSERT INTO plataforma.users (name, phone, auth_provider, subscription_plan)
        SELECT COALESCE(NULLIF(BTRIM(l.contact_name), ''), l.contact_phone), l.contact_phone, 'manual', ${body.data.plan}
        FROM public.leads l
        WHERE l.id = ${id}::uuid AND l.user_id IS NULL AND l.merged_into_lead_id IS NULL
        RETURNING id, name, phone, subscription_plan
      )
      UPDATE public.leads l SET user_id = nuevo.id
      FROM nuevo WHERE l.id = ${id}::uuid
      RETURNING nuevo.id as user_id, nuevo.name, nuevo.phone, nuevo.subscription_plan
    `);
    const user = converted.rows[0] as { user_id: string; name: string; phone: string; subscription_plan: string } | undefined;
    if (!user) return NextResponse.json({ error: "Solicitud no encontrada o ya vinculada a una cuenta." }, { status: 404 });

    const invitacion = await crearInvitacion(user.user_id);
    return NextResponse.json({
      user: { id: user.user_id, name: user.name, phone: user.phone, plan: user.subscription_plan },
      invitacion: { ruta: `/acceso?token=${encodeURIComponent(invitacion.token)}`, expiresAt: invitacion.expiresAt.toISOString() },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear la cuenta desde la solicitud." }, { status: 503 });
  }
}
