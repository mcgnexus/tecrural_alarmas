import { crearLogger } from "@/lib/log/logger";
import { agruparSuscripcionesPorParcela, hayNotificacionReciente, registrarNotificacion } from "@/lib/datos/avisos-repo";
import { ordenSeveridad } from "@/lib/dominio/tipos";
import { canalesConfigurados, obtenerNotificador } from "@/lib/notificaciones";
import type { Canal } from "@/lib/dominio/tipos";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { evaluarYGuardarParcela } from "./evaluacion";
import { registrarSenalSegura } from "./crm";

const log = crearLogger("aplicacion.barrido");

const VENTANA_DEDUP_HORAS = 12;

export interface ResumenBarrido {
  parcelas: number;
  alertas: number;
  enviadas: number;
  omitidas: number;
  errores: number;
  dryRun: boolean;
  canalesConfigurados: Canal[];
}

/**
 * Orquestación del barrido programado: evalúa cada parcela suscrita (motor de
 * alertas), deduplica y entrega por los canales configurados.
 */
export async function ejecutarBarrido(
  opciones: { dryRun?: boolean } = {},
): Promise<ResumenBarrido> {
  const dryRun = opciones.dryRun ?? false;
  const desde = new Date(Date.now() - VENTANA_DEDUP_HORAS * 60 * 60 * 1000);
  const resumen: ResumenBarrido = {
    parcelas: 0,
    alertas: 0,
    enviadas: 0,
    omitidas: 0,
    errores: 0,
    dryRun,
    canalesConfigurados: canalesConfigurados(),
  };

  const grupos = await agruparSuscripcionesPorParcela();
  log.info("barrido.inicio", { data: { parcelas: grupos.length, dryRun } });

  for (const { parcela, suscripciones } of grupos) {
    resumen.parcelas += 1;

    let resultado;
    try {
      resultado = await evaluarYGuardarParcela(parcela.id, parcela.dispositivoId);
    } catch (error) {
      resumen.errores += 1;
      log.error("barrido.evaluar.error", { plot_id: parcela.id }, error);
      continue;
    }

    for (const alerta of resultado.alertas) {
      resumen.alertas += 1;
      const clave = `${alerta.tipo}:${alerta.regla}`;

      for (const suscripcion of suscripciones) {
        if (
          ordenSeveridad[alerta.severidad] <
          ordenSeveridad[suscripcion.severidadMinima]
        ) {
          continue;
        }

        const notificador = obtenerNotificador(suscripcion.canal);
        if (!notificador.configurado()) {
          resumen.omitidas += 1;
          log.warn("barrido.canal.no_configurado", {
            external_source: suscripcion.canal,
            plot_id: parcela.id,
          });
          if (!dryRun) {
            await registrarNotificacion({
              suscripcionId: suscripcion.id,
              alertaId: alerta.id,
              parcelaId: parcela.id,
              canal: suscripcion.canal,
              clave,
              estado: "error",
              error: "canal no configurado",
            });
          }
          continue;
        }

        if (
          !dryRun &&
          (await hayNotificacionReciente(
            parcela.id,
            suscripcion.canal,
            clave,
            desde,
          ))
        ) {
          resumen.omitidas += 1;
          continue;
        }

        if (dryRun) {
          resumen.enviadas += 1;
          continue;
        }

        const envio = await notificador.enviar(suscripcion.destino, {
          parcelaId: parcela.id,
          parcelaNombre: parcela.nombre,
          cultivo: parcela.cultivoSlug as CulturaId,
          alerta,
        });

        if (envio.ok) {
          resumen.enviadas += 1;
          await registrarSenalSegura({
            dispositivoId: parcela.dispositivoId,
            evento: "notificacion_entregada",
            metadata: { canal: suscripcion.canal, tipo: alerta.tipo },
          });
        } else {
          resumen.errores += 1;
        }

        await registrarNotificacion({
          suscripcionId: suscripcion.id,
          alertaId: alerta.id,
          parcelaId: parcela.id,
          canal: suscripcion.canal,
          clave,
          estado: envio.ok ? "enviada" : "error",
          error: envio.ok ? null : (envio.error ?? "error de envío"),
        });

        log.info("barrido.aviso.procesado", {
          external_source: suscripcion.canal,
          plot_id: parcela.id,
          data: { ok: envio.ok, clave },
        });
      }
    }
  }

  log.info("barrido.fin", { data: { ...resumen } });
  return resumen;
}
