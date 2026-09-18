import { NextResponse } from "next/server";
import { resumenLead } from "@/lib/aplicacion/crm";
import { dispositivoValido } from "@/lib/datos/validacion";
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
  if (!dispositivoValido(dispositivo)) {
    return NextResponse.json(
      { error: "Falta el identificador de dispositivo." },
      { status: 400 },
    );
  }

  return conRequestId({ user_id: dispositivo }, async (requestId) => {
    const inicio = Date.now();
    try {
      const resumen = await resumenLead(dispositivo);
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
