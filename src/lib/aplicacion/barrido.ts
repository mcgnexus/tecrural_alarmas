import { crearLogger } from "@/lib/log/logger";
import { agruparSuscripcionesPorParcela, hayNotificacionReciente, registrarNotificacion } from "@/lib/datos/avisos-repo";
import { ordenSeveridad } from "@/lib/dominio/tipos";
import { canalesConfigurados, obtenerNotificador } from "@/lib/notificaciones";
import type { Canal } from "@/lib/dominio/tipos";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { evaluarYGuardarParcela } from "./evaluacion";
import { registrarSenalSegura } from "./crm";
import { debeNotificarCampo, ventanaEvento } from "@/lib/alertas/dedup";
import { obtenerDb } from "@/lib/datos/db";
import { alertas, notificaciones } from "@/lib/datos/schema";
import { and, desc, eq } from "drizzle-orm";

const log = crearLogger("aplicacion.barrido");

const VENTANA_DEDUP_HORAS = 12;
const VENTANA_SIGNIFICATIVA_HORAS = 6;

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
      // dedupKey = userId + plotId + riskType + eventTimeWindow + level (spec 29)
      const ventana = ventanaEvento(new Date(resultado.evaluadoEl), 12);
      const clave = `${parcela.dispositivoId}:${parcela.id}:${alerta.tipo}:${ventana}:${alerta.severidad}`;

      for (const suscripcion of suscripciones) {
        // Spec 30: Verde nunca; Amarillo solo si preventivos; Naranja por defecto; Rojo siempre si canal habilitado; oficiales comportamiento propio
        if (alerta.severidad === "info") continue; // verde nunca
        const esOficial = alerta.titulo.includes("AVISO OFICIAL") || (alerta.fuente as unknown as { id?: string })?.id === "aemet";
        if (!esOficial && ordenSeveridad[alerta.severidad] < ordenSeveridad[suscripcion.severidadMinima]) {
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

        if (!dryRun && (await hayNotificacionReciente(parcela.id, suscripcion.canal, clave, desde))) {
          // deduplicación avanzada: solo enviar si hay cambio significativo
          let debeEnviar = false;
          try {
            const db = obtenerDb();
            const [prev] = await db
              .select({
                mensaje: alertas.mensaje,
                severidad: alertas.severidad,
                fuente: alertas.fuente,
                creadaEn: alertas.creadaEn,
              })
              .from(notificaciones)
              .innerJoin(alertas, eq(notificaciones.alertaId, alertas.id))
              .where(
                and(
                  eq(notificaciones.parcelaId, parcela.id),
                  eq(notificaciones.canal, suscripcion.canal),
                  eq(notificaciones.clave, clave),
                  eq(notificaciones.estado, "enviada"),
                ),
              )
              .orderBy(desc(notificaciones.enviadaEn))
              .limit(1);
            if (prev) {
              const decision = debeNotificarCampo({
                previo: {
                  severidad: prev.severidad as string,
                  mensaje: prev.mensaje,
                  emisorAt: (prev.creadaEn as Date).toISOString(),
                  fuente: (prev.fuente as unknown as { id?: string })?.id ?? "",
                },
                actual: {
                  tipo: alerta.tipo,
                  severidad: alerta.severidad,
                  mensaje: alerta.mensaje,
                  emisorAt: alerta.emisorAt,
                  fuente: (alerta.fuente as unknown as { id?: string })?.id ?? "",
                },
                ventanaHoras: VENTANA_SIGNIFICATIVA_HORAS,
              });
              debeEnviar = decision.enviar;
              if (!debeEnviar) {
                log.debug("barrido.dedup.skip", { plot_id: parcela.id, data: { clave, razon: decision.razon, diff: decision.diffIntensidad } });
              } else {
                log.info("barrido.dedup.bypass", { plot_id: parcela.id, data: { clave, razon: decision.razon } });
              }
            }
          } catch {
            // si falla la consulta, mantener deduplicación conservadora
          }
          if (!debeEnviar) {
            resumen.omitidas += 1;
            continue;
          }
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
