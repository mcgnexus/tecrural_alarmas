import { NextResponse } from "next/server";
import { exportarCuenta } from "@/lib/aplicacion/cuentas";
import { usuarioAutenticado } from "@/lib/datos/sesion-usuario";

export const dynamic = "force-dynamic";

/** Resumen de la cuenta para la página /cuenta. */
export async function GET(req: Request) {
  const userId = usuarioAutenticado(req);
  if (!userId) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const datos = await exportarCuenta(userId);
  if (!datos) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });
  return NextResponse.json(datos);
}
