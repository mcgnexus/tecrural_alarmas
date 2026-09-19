import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { parcelasPlataforma, solicitudesContacto } from "@/lib/datos/plataforma-schema";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { registrarEventoLead } from "@/lib/aplicacion/lead-events";

const log = crearLogger("api.v1.commercial.contact-request");
export const dynamic = "force-dynamic";

const esquema = z.object({
  plotId: z.string().uuid(),
  service: z.string().trim().min(1).max(80),
  preferredChannel: z.enum(["WHATSAPP", "EMAIL", "PHONE", "TELEGRAM"]),
  message: z.string().trim().max(2000).optional(),
});

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = esquema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud no válida.", issues: parsed.error.issues }, { status: 400 });
  }

  const url = new URL(req.url);
  const headerAnon = req.headers.get("x-anonymous-id")?.trim() || null;
  const headerUser = req.headers.get("x-user-id")?.trim() || null;
  const queryAnon = url.searchParams.get("anonymousId")?.trim() || null;
  const queryUser = url.searchParams.get("userId")?.trim() || null;
  const b = body as Record<string, unknown>;
  const anonymousId = (b.anonymousId as string | undefined) ?? headerAnon ?? queryAnon ?? null;
  const userId = (b.userId as string | undefined) ?? headerUser ?? queryUser ?? null;

  return conRequestId({ user_id: anonymousId ?? userId ?? undefined }, async (requestId) => {
    const inicio = Date.now();
    try {
      const db = obtenerDb();
      const [plot] = await db
        .select({ id: parcelasPlataforma.id })
        .from(parcelasPlataforma)
        .where(eq(parcelasPlataforma.id, parsed.data.plotId))
        .limit(1);
      if (!plot) {
        return conCabeceraRequestId(
          NextResponse.json({ error: "Parcela no encontrada." }, { status: 404 }),
          requestId,
        );
      }
      const [row] = await db
        .insert(solicitudesContacto)
        .values({
          plotId: parsed.data.plotId,
          service: parsed.data.service,
          preferredChannel: parsed.data.preferredChannel,
          message: parsed.data.message ?? null,
          anonymousId,
          userId: userId ?? null,
        })
        .returning({ id: solicitudesContacto.id });

      // Lead scoring: contacto solicitado (no acepta puntos del frontend)
      try {
        await registrarEventoLead({
          anonymousId: anonymousId ?? null,
          userId: userId ?? null,
          plotId: parsed.data.plotId,
          eventType: "CONTACT_REQUESTED",
          metadata: { service: parsed.data.service, preferredChannel: parsed.data.preferredChannel },
        });
      } catch (e) {
        log.warn("commercial.contact.lead.error", {}, e);
      }

      log.info("commercial.contact.ok", { status: 201, duracion_ms: Date.now() - inicio, data: { service: parsed.data.service } });
      return conCabeceraRequestId(NextResponse.json({ id: row!.id }, { status: 201 }), requestId);
    } catch (error) {
      log.error("commercial.contact.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo registrar la solicitud." }, { status: 503 }), requestId);
    }
  });
}
