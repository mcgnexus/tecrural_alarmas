import { NextResponse } from "next/server";
import { evaluarRiesgoAnonimo } from "@/lib/aplicacion/riesgo";
import { cuerpoRiesgoValido } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.riesgo");

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!cuerpoRiesgoValido(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const resultado = await evaluarRiesgoAnonimo(cuerpo);
      log.info("riesgo.evaluar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        external_source: resultado.fuente.id,
      });
      return conCabeceraRequestId(NextResponse.json(resultado), requestId);
    } catch (error) {
      log.error(
        "riesgo.evaluar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron obtener los datos meteorológicos ahora." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
