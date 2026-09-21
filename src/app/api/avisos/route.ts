import { NextResponse } from "next/server";
import {
  crearSuscripcion,
  listarSuscripciones,
} from "@/lib/datos/avisos-repo";
import { obtenerParcela } from "@/lib/datos/parcelas-repo";
import { notificarNuevoSuscriptor } from "@/lib/notificaciones/aviso-negocio";
import { suscripcionValida } from "@/lib/datos/validacion";
import { exigirDispositivo } from "@/lib/datos/sesion-dispositivo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { registrarSenalSegura } from "@/lib/aplicacion/crm";

const log = crearLogger("api.avisos");

export const dynamic = "force-dynamic";

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
      const avisos = await listarSuscripciones(idDispositivo);
      log.info("avisos.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
      });
      return conCabeceraRequestId(NextResponse.json(avisos), requestId);
    } catch (error) {
      log.error(
        "avisos.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar los avisos ahora." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!suscripcionValida(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  const identidad = exigirDispositivo(req, cuerpo.dispositivoId);
  if (!identidad.ok) {
    return NextResponse.json({ error: identidad.error }, { status: identidad.status });
  }
  const idDispositivo = identidad.dispositivoId;

  return conRequestId(
    { user_id: idDispositivo, plot_id: cuerpo.parcelaId ?? undefined },
    async (requestId) => {
      const inicio = Date.now();
      try {
        const aviso = await crearSuscripcion({
          dispositivoId: idDispositivo,
          parcelaId: cuerpo.parcelaId ?? null,
          canal: cuerpo.canal,
          destino: cuerpo.destino,
          severidadMinima: cuerpo.severidadMinima,
        });
        log.info("avisos.crear.ok", {
          status: 201,
          duracion_ms: Date.now() - inicio,
          external_source: aviso.canal,
        });
        // Aviso al equipo por Telegram (nunca rompe el alta si falla).
        const parcela = aviso.parcelaId
          ? await obtenerParcela(aviso.parcelaId).catch(() => null)
          : null;
        await notificarNuevoSuscriptor({
          canal: aviso.canal,
          destino: aviso.destino,
          severidadMinima: aviso.severidadMinima,
          parcelaNombre: parcela?.nombre ?? null,
          origen: "api/avisos",
        });
        await registrarSenalSegura({
          dispositivoId: idDispositivo,
          evento: "avisos_activados",
          metadata: { canal: aviso.canal },
        });
        return conCabeceraRequestId(
          NextResponse.json(aviso, { status: 201 }),
          requestId,
        );
      } catch (error) {
        if (error instanceof Error && error.message === "Parcela no encontrada") {
          return conCabeceraRequestId(
            NextResponse.json(
              { error: "Parcela no encontrada." },
              { status: 404 },
            ),
            requestId,
          );
        }
        log.error(
          "avisos.crear.error",
          { status: 503, duracion_ms: Date.now() - inicio },
          error,
        );
        return conCabeceraRequestId(
          NextResponse.json(
            { error: "No se pudo guardar el aviso ahora." },
            { status: 503 },
          ),
          requestId,
        );
      }
    },
  );
}
