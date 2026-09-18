import { NextResponse } from "next/server";
import { registrarSenal } from "@/lib/aplicacion/crm";
import { senalCrmValida } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.crm.eventos");

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!senalCrmValida(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  return conRequestId(
    { user_id: cuerpo.dispositivoId, external_source: "crm" },
    async (requestId) => {
      const inicio = Date.now();
      try {
        const resumen = await registrarSenal({
          dispositivoId: cuerpo.dispositivoId,
          evento: cuerpo.evento,
          intereses: cuerpo.intereses,
          metadata: cuerpo.metadata,
          source: cuerpo.source,
          cropType: cuerpo.cropType,
          serviceKey: cuerpo.serviceKey,
        });
        log.info("crm.evento.ok", {
          status: 200,
          duracion_ms: Date.now() - inicio,
          data: { score: resumen.score, nivel: resumen.nivel },
        });
        return conCabeceraRequestId(NextResponse.json(resumen), requestId);
      } catch (error) {
        log.error(
          "crm.evento.error",
          { status: 503, duracion_ms: Date.now() - inicio },
          error,
        );
        return conCabeceraRequestId(
          NextResponse.json(
            { error: "No se pudo registrar la señal ahora." },
            { status: 503 },
          ),
          requestId,
        );
      }
    },
  );
}
