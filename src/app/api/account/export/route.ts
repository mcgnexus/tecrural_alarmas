import { NextResponse } from "next/server";
import { exportarCuenta } from "@/lib/aplicacion/cuentas";
import { usuarioAutenticado } from "@/lib/datos/sesion-usuario";

export const dynamic = "force-dynamic";

/** Exporta los datos de la cuenta (RGPD: acceso/portabilidad). */
export async function GET(req: Request) {
  const userId = usuarioAutenticado(req);
  if (!userId) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const datos = await exportarCuenta(userId);
  if (!datos) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });

  return new NextResponse(JSON.stringify(datos, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="tecrural-cuenta-${userId}.json"`,
    },
  });
}
