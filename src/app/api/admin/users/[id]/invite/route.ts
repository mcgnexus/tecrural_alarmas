import { NextResponse } from "next/server";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { buscarUsuarioPorId, crearInvitacion } from "@/lib/datos/usuarios-repo";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.admin.users.invite");
export const dynamic = "force-dynamic";

/** Genera una nueva invitación de un solo uso para una cuenta existente. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const usuario = await buscarUsuarioPorId(id);
  if (!usuario) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });

  try {
    const { token, expiresAt } = await crearInvitacion(id);
    log.info("admin.users.invite.ok", { user_id: id });
    return NextResponse.json({
      usuarioId: id,
      invitacion: {
        token,
        expiresAt: expiresAt.toISOString(),
        ruta: `/acceso?token=${encodeURIComponent(token)}`,
      },
    });
  } catch (e) {
    log.error("admin.users.invite.error", {}, e);
    return NextResponse.json({ error: "No se pudo crear la invitación." }, { status: 503 });
  }
}
