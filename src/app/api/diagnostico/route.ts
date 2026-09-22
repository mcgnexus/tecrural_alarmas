import { NextResponse } from "next/server";
import { diagnosticarConDeepSeek } from "@/lib/diagnostico/proveedor";
import { esquemaDiagnosticoImagen } from "@/lib/diagnostico/contrato";
import { exigirDispositivo } from "@/lib/datos/sesion-dispositivo";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cuerpo = await req.json().catch(() => null);
  const parsed = esquemaDiagnosticoImagen.safeParse(cuerpo);
  if (!parsed.success || parsed.data.imageData.length > 8_000_000) {
    return NextResponse.json({ error: "Imagen o datos no válidos. Usa JPG, PNG o WebP de tamaño reducido." }, { status: 400 });
  }
  const identidad = exigirDispositivo(req, null);
  if (!identidad.ok) return NextResponse.json({ error: identidad.error }, { status: identidad.status });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? identidad.dispositivoId;
  const limite = rateLimit(`diagnostico:${ip}`, 5, 60 * 60_000);
  if (!limite.ok) return NextResponse.json({ error: "Has alcanzado el límite de diagnósticos. Inténtalo más tarde." }, { status: 429, headers: rateLimitResponse(limite.remaining, limite.resetAt) });
  try {
    return NextResponse.json(await diagnosticarConDeepSeek(parsed.data));
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo completar el diagnóstico.";
    const configuracion = mensaje === "Diagnóstico visual no configurado.";
    return NextResponse.json({ error: configuracion ? mensaje : "No se pudo completar el diagnóstico ahora." }, { status: configuracion ? 503 : 502 });
  }
}
