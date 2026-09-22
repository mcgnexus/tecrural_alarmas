import { NextResponse } from "next/server";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { listarHistorialRegla } from "@/lib/datos/reglas-repo";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const acceso = await verificarAccesoAdmin(req);
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status });
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await listarHistorialRegla(id));
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el historial." }, { status: 503 });
  }
}
