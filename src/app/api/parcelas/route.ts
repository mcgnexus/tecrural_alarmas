import { NextResponse } from "next/server";
import { crearParcela, listarParcelas } from "@/lib/datos/parcelas-repo";
import { cuerpoParcelaValido, dispositivoValido } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { registrarSenalSegura } from "@/lib/aplicacion/crm";

const log = crearLogger("api.parcelas");

export const dynamic = "force-dynamic";

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
      const parcelas = await listarParcelas(dispositivo);
      log.info("parcelas.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
      });
      return conCabeceraRequestId(NextResponse.json(parcelas), requestId);
    } catch (error) {
      log.error(
        "parcelas.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar las parcelas ahora." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!cuerpoParcelaValido(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  return conRequestId({ user_id: cuerpo.dispositivoId }, async (requestId) => {
    const inicio = Date.now();
    try {
      const parcela = await crearParcela({
        dispositivoId: cuerpo.dispositivoId,
        nombre: cuerpo.nombre,
        cultivo: cuerpo.cultivo,
        latitud: cuerpo.latitud,
        longitud: cuerpo.longitud,
      });
      log.info("parcelas.crear.ok", {
        status: 201,
        duracion_ms: Date.now() - inicio,
        plot_id: parcela.id,
      });
      await registrarSenalSegura({
        dispositivoId: cuerpo.dispositivoId,
        evento: "parcela_anadida",
        cropType: cuerpo.cultivo,
      });
      return conCabeceraRequestId(
        NextResponse.json(parcela, { status: 201 }),
        requestId,
      );
    } catch (error) {
      log.error(
        "parcelas.crear.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo guardar la parcela ahora." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
