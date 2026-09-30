import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { usuarios } from "@/lib/datos/plataforma-schema";
import { usuarioAutenticado } from "@/lib/datos/sesion-usuario";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { VERSION_CONSENTIMIENTO } from "@/lib/privacidad/consentimiento";

const log = crearLogger("api.consent");
export const dynamic = "force-dynamic";
const CURRENT_VERSION = VERSION_CONSENTIMIENTO;

export async function POST(req: Request) {
  const sesionUserId = usuarioAutenticado(req);
  if (!sesionUserId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    privacyConsent?: boolean;
    marketingConsent?: boolean;
    consentVersion?: string;
  } | null;

  if (typeof body?.privacyConsent !== "boolean") {
    return NextResponse.json({ error: "Falta privacyConsent." }, { status: 400 });
  }

  // El userId del cuerpo, si se envía por compatibilidad, debe coincidir
  // con la identidad autenticada; nunca se usa para elegir otro usuario.
  if (body.userId != null && body.userId !== sesionUserId) {
    return NextResponse.json({ error: "Prohibido." }, { status: 403 });
  }
  const userId = sesionUserId;

  // No considerar alerta == publicidad: marketingConsent es separado y opcional
  if (body.privacyConsent !== true) {
    return NextResponse.json({ error: "Debe aceptar la política de privacidad para continuar." }, { status: 400 });
  }

  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const db = obtenerDb();
      const version = body.consentVersion ?? CURRENT_VERSION;
      const now = new Date();

      await db
        .update(usuarios)
        .set({
          privacyVersion: version,
          consentVersion: version,
          consentTimestamp: now,
          // marketing separado: solo si se marca explícitamente
          marketingConsent: body.marketingConsent === true,
          marketingConsentAt: body.marketingConsent === true ? now : null,
          updatedAt: now,
        })
        .where(eq(usuarios.id, userId));

      log.info("consent.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { version } });
      return conCabeceraRequestId(NextResponse.json({ consent_version: version, consent_timestamp: now.toISOString() }), requestId);
    } catch (e) {
      log.error("consent.error", { status: 503, duracion_ms: Date.now() - inicio }, e);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo guardar el consentimiento." }, { status: 503 }), requestId);
    }
  });
}

export async function GET(req: Request) {
  const sesionUserId = usuarioAutenticado(req);
  if (!sesionUserId) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const paramUserId = new URL(req.url).searchParams.get("userId");
  // El parámetro, si se envía por compatibilidad, debe coincidir con la
  // sesión; la lectura siempre usa la identidad autenticada.
  if (paramUserId != null && paramUserId !== sesionUserId) {
    return NextResponse.json({ error: "Prohibido." }, { status: 403 });
  }
  const userId = sesionUserId;
  return conRequestId({}, async (requestId) => {
    try {
      const db = obtenerDb();
      const [u] = await db.select({ privacyVersion: usuarios.privacyVersion, consentVersion: usuarios.consentVersion, consentTimestamp: usuarios.consentTimestamp, marketingConsent: usuarios.marketingConsent, marketingConsentAt: usuarios.marketingConsentAt }).from(usuarios).where(eq(usuarios.id, userId)).limit(1);
      return conCabeceraRequestId(NextResponse.json(u ?? null), requestId);
    } catch {
      return conCabeceraRequestId(NextResponse.json({ error: "Error" }, { status: 503 }), requestId);
    }
  });
}
