import { NextResponse } from "next/server";
import { listarAlertasFitosanitarias } from "@/lib/datos/fitosanitario-repo";
import { autenticarAgente, respuestaNoAutorizada } from "@/lib/ia/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const acceso = autenticarAgente(req);
  if (!acceso.ok) return respuestaNoAutorizada(acceso);
  const url = new URL(req.url);
  try {
    const avisos = await listarAlertasFitosanitarias({
      cropId: url.searchParams.get("cropId") || undefined,
      province: url.searchParams.get("province") || undefined,
      municipality: url.searchParams.get("municipality") || undefined,
      region: url.searchParams.get("region") || undefined,
      limite: Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 100),
    });
    return NextResponse.json({ avisos, total: avisos.length });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las alertas." }, { status: 503 });
  }
}
