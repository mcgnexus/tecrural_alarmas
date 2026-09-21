import { NextResponse } from "next/server";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { borrarCuenta } from "@/lib/aplicacion/cuentas";
import { buscarUsuarioPorId } from "@/lib/datos/usuarios-repo";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.admin.users.id");
export const dynamic = "force-dynamic";

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
