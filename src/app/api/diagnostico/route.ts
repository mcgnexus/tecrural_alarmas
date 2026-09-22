import { NextResponse } from "next/server";
import { diagnosticarConDeepSeek } from "@/lib/diagnostico/proveedor";
import { esquemaDiagnosticoImagen } from "@/lib/diagnostico/contrato";
import { exigirDispositivo } from "@/lib/datos/sesion-dispositivo";
import { verificarAccesoAdmin } from "@/lib/admin/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cuerpo = await req.json().catch(() => null);
  const parsed = esquemaDiagnosticoImagen.safeParse(cuerpo);
  if (!parsed.success || parsed.data.imageData.length > 8_000_000) {
    return NextResponse.json({ error: "Imagen o datos no válidos. Usa JPG, PNG o WebP de tamaño reducido." }, { status: 400 });
  }
  // Fase 8: gate premium — aunque UI oculta, servidor autoriza plan+flag
  const { canAccessServer, planForUser } = await import("@/lib/planes/permisos");
  const { isFlagEnabled } = await import("@/config/feature-flags");
  const puedeDiagnostico = canAccessServer(planForUser(), "image_diagnosis") && isFlagEnabled("image_diagnosis");
  if (!puedeDiagnostico) {
    const esAdminDiag = (await verificarAccesoAdmin(req)).ok;
    if (!esAdminDiag) return NextResponse.json({ error: "Funcionalidad premium no habilitada. Solicita acceso.", code: "PREMIUM_REQUIRED" }, { status: 403 });
  }
  const esAdmin = (await verificarAccesoAdmin(req)).ok;
  const identidad = esAdmin ? { ok: true as const, dispositivoId: "admin" } : exigirDispositivo(req, null);
  if (!identidad.ok) return NextResponse.json({ error: identidad.error }, { status: identidad.status });
  if (!esAdmin) {
    const clave = `diagnostico:free:${identidad.dispositivoId}`;
    const limite = rateLimit(clave, 2, 7 * 24 * 60 * 60_000);
    if (!limite.ok) return NextResponse.json({ error: "Plan gratuito: 2 diagnósticos por semana. Inicia sesión como admin para uso ilimitado." }, { status: 429, headers: rateLimitResponse(limite.remaining, limite.resetAt) });
  }
  try {
    return NextResponse.json(await diagnosticarConDeepSeek(parsed.data));
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo completar el diagnóstico.";
    const configuracion = mensaje === "Diagnóstico visual no configurado.";
    return NextResponse.json({ error: configuracion ? mensaje : "No se pudo completar el diagnóstico ahora." }, { status: configuracion ? 503 : 502 });
  }
}
