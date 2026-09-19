import { and, eq, gt, inArray } from "drizzle-orm";
import { obtenerDb } from "./db";
import { notificaciones, parcelas, suscripcionesAviso } from "./schema";
import type { SuscripcionDto } from "./tipos";
import type { Canal, EstadoNotificacion, Severidad } from "@/lib/dominio/tipos";

type FilaSuscripcion = typeof suscripcionesAviso.$inferSelect;
type FilaParcela = typeof parcelas.$inferSelect;

export interface AvisosPorParcela {
  parcela: FilaParcela;
  suscripciones: FilaSuscripcion[];
}

function aSuscripcionDto(fila: FilaSuscripcion): SuscripcionDto {
  return {
    id: fila.id,
    parcelaId: fila.parcelaId,
    canal: fila.canal,
    destino: fila.destino,
    severidadMinima: fila.severidadMinima,
    activa: fila.activa,
    creadaEl: fila.creadaEn.toISOString(),
  };
}

export async function listarSuscripciones(
  dispositivoId: string,
): Promise<SuscripcionDto[]> {
  const db = obtenerDb();
  const filas = await db
    .select()
    .from(suscripcionesAviso)
    .where(eq(suscripcionesAviso.dispositivoId, dispositivoId))
    .orderBy(suscripcionesAviso.creadaEn);
  return filas.map(aSuscripcionDto);
}

export async function crearSuscripcion(input: {
  dispositivoId: string;
  parcelaId: string | null;
  canal: Canal;
  destino: string;
  severidadMinima?: Severidad;
}): Promise<SuscripcionDto> {
  const db = obtenerDb();
  if (input.parcelaId) {
    const [parcela] = await db
      .select({ dispositivoId: parcelas.dispositivoId })
      .from(parcelas)
      .where(eq(parcelas.id, input.parcelaId))
      .limit(1);
    if (!parcela || parcela.dispositivoId !== input.dispositivoId) {
      throw new Error("Parcela no encontrada");
    }
  }

  const [fila] = await db
    .insert(suscripcionesAviso)
    .values({
      dispositivoId: input.dispositivoId,
      parcelaId: input.parcelaId,
      canal: input.canal,
      destino: input.destino,
      severidadMinima: input.severidadMinima ?? "alerta",
    })
    .returning();
  if (!fila) throw new Error("No se pudo guardar el aviso.");
  return aSuscripcionDto(fila);
}

export async function eliminarSuscripcion(
  id: string,
  dispositivoId: string,
): Promise<boolean> {
  const db = obtenerDb();
  const borradas = await db
    .delete(suscripcionesAviso)
    .where(
      and(
        eq(suscripcionesAviso.id, id),
        eq(suscripcionesAviso.dispositivoId, dispositivoId),
      ),
    )
    .returning({ id: suscripcionesAviso.id });
  return borradas.length > 0;
}

/** Parcelas con al menos una suscripción activa, expandiendo las suscripciones de dispositivo completo. */
export async function agruparSuscripcionesPorParcela(): Promise<AvisosPorParcela[]> {
  const db = obtenerDb();
  const suscripciones = await db
    .select()
    .from(suscripcionesAviso)
    .where(eq(suscripcionesAviso.activa, true));
  if (suscripciones.length === 0) return [];

  const dispositivos = [...new Set(suscripciones.map((s) => s.dispositivoId))];
  const filasParcelas = await db
    .select()
    .from(parcelas)
    .where(inArray(parcelas.dispositivoId, dispositivos));

  const porParcela = new Map<string, AvisosPorParcela>();
  for (const parcela of filasParcelas) {
    porParcela.set(parcela.id, { parcela, suscripciones: [] });
  }
  for (const suscripcion of suscripciones) {
    if (suscripcion.parcelaId) {
      porParcela.get(suscripcion.parcelaId)?.suscripciones.push(suscripcion);
      continue;
    }
    for (const parcela of filasParcelas) {
      if (parcela.dispositivoId === suscripcion.dispositivoId) {
        porParcela.get(parcela.id)?.suscripciones.push(suscripcion);
      }
    }
  }
  return [...porParcela.values()].filter((e) => e.suscripciones.length > 0);
}

export async function hayNotificacionReciente(
  parcelaId: string,
  canal: Canal,
  clave: string,
  desde: Date,
): Promise<boolean> {
  const db = obtenerDb();
  const filas = await db
    .select({ id: notificaciones.id })
    .from(notificaciones)
    .where(
      and(
        eq(notificaciones.parcelaId, parcelaId),
        eq(notificaciones.canal, canal),
        eq(notificaciones.clave, clave),
        eq(notificaciones.estado, "enviada"),
        gt(notificaciones.enviadaEn, desde),
      ),
    )
    .limit(1);
  return filas.length > 0;
}

export async function registrarNotificacion(input: {
  suscripcionId: string;
  alertaId: string | null;
  parcelaId: string;
  canal: Canal;
  clave: string;
  estado: EstadoNotificacion;
  error?: string | null;
}): Promise<void> {
  const db = obtenerDb();
  const ahora = new Date();
  await db.insert(notificaciones).values({
    suscripcionId: input.suscripcionId,
    alertaId: input.alertaId,
    parcelaId: input.parcelaId,
    canal: input.canal,
    clave: input.clave,
    estado: input.estado,
    intentos: 1,
    ultimoIntentoEn: ahora,
    enviadaEn: input.estado === "enviada" ? ahora : null,
    error: input.error ?? null,
  });
}
