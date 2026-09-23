import { NextResponse } from "next/server";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { borrarCuenta } from "@/lib/aplicacion/cuentas";
import { buscarUsuarioPorId } from "@/lib/datos/usuarios-repo";
import { actualizarUsuario } from "@/lib/datos/usuarios-repo";
import { crearLogger } from "@/lib/log/logger";
import { z } from "zod";

const log = crearLogger("api.admin.users.id");
export const dynamic = "force-dynamic";

const esquemaActualizar = z.object({
  nombre: z.string().trim().min(2).max(80).optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email().max(120).nullable().or(z.literal("")).optional(),
  plan: z.enum(["free", "essential", "monitor", "pro", "cooperative"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const parsed = esquemaActualizar.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos de usuario no válidos." }, { status: 400 });

  const usuario = await buscarUsuarioPorId(id);
  if (!usuario) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });
  const datos = parsed.data;
  try {
    await actualizarUsuario(id, {
      ...(datos.nombre !== undefined ? { name: datos.nombre } : {}),
      ...(datos.telefono !== undefined ? { phone: datos.telefono || null } : {}),
      ...(datos.email !== undefined ? { email: datos.email || null } : {}),
      ...(datos.plan !== undefined ? { subscriptionPlan: datos.plan } : {}),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("admin.users.actualizar.error", { user_id: id }, error);
    return NextResponse.json({ error: "No se pudo actualizar la cuenta." }, { status: 503 });
  }
}

/** Borra una cuenta y anonimiza sus datos. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verificarAccesoAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const usuario = await buscarUsuarioPorId(id);
  if (!usuario) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });

  try {
    await borrarCuenta(id);
    log.info("admin.users.borrar.ok", { user_id: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("admin.users.borrar.error", {}, e);
    return NextResponse.json({ error: "No se pudo borrar la cuenta." }, { status: 503 });
  }
}
