import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { usuarios } from "@/lib/datos/plataforma-schema";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { VERSION_CONSENTIMIENTO } from "@/lib/privacidad/consentimiento";

const log = crearLogger("api.consent");
export const dynamic = "force-dynamic";
const CURRENT_VERSION = VERSION_CONSENTIMIENTO;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    privacyConsent?: boolean;
    marketingConsent?: boolean;
    consentVersion?: string;
  } | null;

  if (!body?.userId || typeof body.privacyConsent !== "boolean") {
    return NextResponse.json({ error: "Falta userId o privacyConsent." }, { status: 400 });
  }

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
        .where(eq(usuarios.id, body.userId!));

      log.info("consent.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { version } });
      return conCabeceraRequestId(NextResponse.json({ consent_version: version, consent_timestamp: now.toISOString() }), requestId);
    } catch (e) {
      log.error("consent.error", { status: 503, duracion_ms: Date.now() - inicio }, e);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo guardar el consentimiento." }, { status: 503 }), requestId);
    }
  });
}

export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Falta userId." }, { status: 400 });
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
