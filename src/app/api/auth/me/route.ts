import { NextResponse } from "next/server";
import { usuarioAutenticado } from "@/lib/datos/sesion-usuario";
import { buscarUsuarioPorId } from "@/lib/datos/usuarios-repo";

export const dynamic = "force-dynamic";

/** Devuelve la cuenta asociada a la sesión, si la hay. */
export async function GET(req: Request) {
  const userId = usuarioAutenticado(req);
  if (!userId) return NextResponse.json({ autenticado: false });
  const usuario = await buscarUsuarioPorId(userId);
  if (!usuario) return NextResponse.json({ autenticado: false });
  return NextResponse.json({
    autenticado: true,
    usuario: {
      id: usuario.id,
      nombre: usuario.name,
      email: usuario.email,
      telefono: usuario.phone,
    },
  });
}
