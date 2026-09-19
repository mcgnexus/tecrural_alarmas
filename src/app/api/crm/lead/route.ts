import { NextResponse } from "next/server";
import { resumenLead } from "@/lib/aplicacion/crm";
import { exigirDispositivo } from "@/lib/datos/sesion-dispositivo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.crm.lead");

export const dynamic = "force-dynamic";

const VACIO = {
  leadId: null,
  score: 0,
  nivel: "frio",
  estado: "NEW",
  intereses: [],
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dispositivo = url.searchParams.get("dispositivo");
  const identidad = exigirDispositivo(req, dispositivo);
  if (!identidad.ok) {
    return NextResponse.json({ error: identidad.error }, { status: identidad.status });
  }
  const idDispositivo = identidad.dispositivoId;

  return conRequestId({ user_id: idDispositivo }, async (requestId) => {
    const inicio = Date.now();
    try {
      const resumen = await resumenLead(idDispositivo);
      log.info("crm.lead.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
      });
      return conCabeceraRequestId(NextResponse.json(resumen ?? VACIO), requestId);
    } catch (error) {
      log.error(
        "crm.lead.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo cargar el resumen ahora." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
