import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { obtenerDb } from "./db";
import { alertas, evaluaciones, parcelas, suscripcionesAviso } from "./schema";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import type { ParcelaDto } from "./tipos";
import type { ResultadoEvaluacion } from "@/lib/dominio/tipos";

type FilaParcela = typeof parcelas.$inferSelect;
type FilaEvaluacion = typeof evaluaciones.$inferSelect;
type FilaAlerta = typeof alertas.$inferSelect;

function aParcelaDto(fila: FilaParcela): ParcelaDto {
  return {
    id: fila.id,
    nombre: fila.nombre,
    cultivo: fila.cultivoSlug as CulturaId,
    latitud: fila.latitud,
    longitud: fila.longitud,
    creadaEl: fila.creadaEn.toISOString(),
    ultimaEvaluacion: null,
  };
}

function aResultado(
  fila: FilaParcela,
  ev: FilaEvaluacion | null,
  alertasFila: FilaAlerta[],
): ResultadoEvaluacion | null {
  if (!ev) return null;
  return {
    latitud: fila.latitud,
    longitud: fila.longitud,
    cultivo: fila.cultivoSlug as CulturaId,
    fenofase: ev.fenofase,
    evaluadoEl: ev.evaluadaEn.toISOString(),
    demandaHidrica: ev.demandaHidrica,
    fuente: ev.fuenteDatos,
    alertas: alertasFila.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      mensaje: a.mensaje,
      severidad: a.severidad,
      regla: a.regla,
      cultivo: fila.cultivoSlug as CulturaId,
      fenofase: a.fenofase ?? undefined,
      emisorAt: a.creadaEn.toISOString(),
      datosUtilizados: a.datosUtilizados,
      vigenciaHasta: a.vigenciaHasta ?? undefined,
      fuente: a.fuente,
    })),
  };
}

function ordenarPorSeveridad(alertasLista: ResultadoEvaluacion["alertas"]) {
  const orden: Record<string, number> = {
    info: 0,
    aviso: 1,
    alerta: 2,
    critica: 3,
  };
  return [...alertasLista].sort(
    (a, b) => (orden[b.severidad] ?? 0) - (orden[a.severidad] ?? 0),
  );
}

export async function listarParcelas(
  dispositivoId: string | null,
  userId?: string | null,
): Promise<ParcelaDto[]> {
  const db = obtenerDb();
  const filtro = userId && dispositivoId
    ? or(
        eq(parcelas.userId, userId),
        and(isNull(parcelas.userId), eq(parcelas.dispositivoId, dispositivoId)),
      )
    : userId
      ? eq(parcelas.userId, userId)
      : dispositivoId
        ? eq(parcelas.dispositivoId, dispositivoId)
        : undefined;
  const filas = await db
    .select()
    .from(parcelas)
    .where(filtro)
    .orderBy(desc(parcelas.creadaEn));

  if (filas.length === 0) return [];

  const ids = filas.map((fila) => fila.id);
  const ordenadas = await db
    .select()
    .from(evaluaciones)
    .where(inArray(evaluaciones.parcelaId, ids))
    .orderBy(evaluaciones.parcelaId, desc(evaluaciones.evaluadaEn));
  const ultimas = [
    ...new Map(ordenadas.map((e) => [e.parcelaId, e] as const)).values(),
  ];
  const porParcela = new Map(ultimas.map((e) => [e.parcelaId, e] as const));

  const idsEval = ultimas.map((e) => e.id);
  let alertasFila: FilaAlerta[] = [];
  if (idsEval.length > 0) {
    alertasFila = await db
      .select()
      .from(alertas)
      .where(inArray(alertas.evaluacionId, idsEval))
      .orderBy(alertas.creadaEn);
  }
  const alertasPorEval = new Map<string, FilaAlerta[]>();
  for (const a of alertasFila) {
    const lista = alertasPorEval.get(a.evaluacionId) ?? [];
    lista.push(a);
    alertasPorEval.set(a.evaluacionId, lista);
  }

  return filas.map((fila) => {
    const ev = porParcela.get(fila.id) ?? null;
    const dto = aParcelaDto(fila);
    dto.ultimaEvaluacion = aResultado(
      fila,
      ev,
      ev ? (alertasPorEval.get(ev.id) ?? []) : [],
    );
    return dto;
  });
}

export async function obtenerParcela(id: string): Promise<FilaParcela | null> {
  const db = obtenerDb();
  const [fila] = await db
    .select()
    .from(parcelas)
    .where(eq(parcelas.id, id))
    .limit(1);
  return fila ?? null;
}

export async function crearParcela(input: {
  dispositivoId: string;
  userId?: string | null;
  nombre: string;
  cultivo: CulturaId;
  latitud: number;
  longitud: number;
}): Promise<ParcelaDto> {
  const db = obtenerDb();
  const [fila] = await db
    .insert(parcelas)
    .values({
      dispositivoId: input.dispositivoId,
      userId: input.userId ?? null,
      nombre: input.nombre,
      cultivoSlug: input.cultivo,
      latitud: input.latitud,
      longitud: input.longitud,
    })
    .returning();
  if (!fila) throw new Error("No se pudo crear la parcela.");
  return aParcelaDto(fila);
}

/** Reutiliza la parcela gratuita creada para el mismo dispositivo, cultivo y coordenadas. */
export async function obtenerOCrearParcela(input: {
  dispositivoId: string;
  nombre: string;
  cultivo: CulturaId;
  latitud: number;
  longitud: number;
}): Promise<ParcelaDto> {
  const db = obtenerDb();
  const [existente] = await db
    .select()
    .from(parcelas)
    .where(and(
      eq(parcelas.dispositivoId, input.dispositivoId),
      eq(parcelas.nombre, input.nombre),
      eq(parcelas.cultivoSlug, input.cultivo),
      eq(parcelas.latitud, input.latitud),
      eq(parcelas.longitud, input.longitud),
    ))
    .limit(1);
  return existente ? aParcelaDto(existente) : crearParcela(input);
}

export async function eliminarParcela(
  id: string,
  dispositivoId: string,
  userId?: string | null,
): Promise<boolean> {
  const db = obtenerDb();
  const dueno = userId
    ? or(
        eq(parcelas.userId, userId),
        and(isNull(parcelas.userId), eq(parcelas.dispositivoId, dispositivoId)),
      )
    : eq(parcelas.dispositivoId, dispositivoId);
  const borradas = await db
    .delete(parcelas)
    .where(and(eq(parcelas.id, id), dueno))
    .returning({ id: parcelas.id });
  return borradas.length > 0;
}

/** Vincula a la cuenta las parcelas creadas antes como anónimas en un dispositivo. */
export async function reclamarParcelasDeDispositivo(
  userId: string,
  dispositivoId: string,
): Promise<number> {
  const db = obtenerDb();
  const filas = await db
    .update(parcelas)
    .set({ userId })
    .where(and(eq(parcelas.dispositivoId, dispositivoId), isNull(parcelas.userId)))
    .returning({ id: parcelas.id });
  await db
    .update(suscripcionesAviso)
    .set({ userId })
    .where(and(eq(suscripcionesAviso.dispositivoId, dispositivoId), isNull(suscripcionesAviso.userId)));
  return filas.length;
}

/** Borra (anonimiza) todas las parcelas de una cuenta. */
export async function eliminarParcelasDeUsuario(userId: string): Promise<void> {
  const db = obtenerDb();
  await db.delete(parcelas).where(eq(parcelas.userId, userId));
}

/** Borra las suscripciones de aviso de una cuenta. */
export async function eliminarSuscripcionesDeUsuario(userId: string): Promise<void> {
  const db = obtenerDb();
  await db.delete(suscripcionesAviso).where(eq(suscripcionesAviso.userId, userId));
}

/** Persistencia pura: guarda una evaluación ya calculada y sus alertas. */
export async function guardarEvaluacion(
  parcela: FilaParcela,
  resultado: ResultadoEvaluacion,
): Promise<ResultadoEvaluacion> {
  const db = obtenerDb();

  const creadas = await db
    .insert(evaluaciones)
    .values({
      parcelaId: parcela.id,
      fenofase: resultado.fenofase,
      fuenteDatos: resultado.fuente,
      demandaHidrica: resultado.demandaHidrica,
    })
    .returning();
  const ev = creadas[0];
  if (!ev) throw new Error("No se pudo guardar la evaluación.");

  let alertasCreadas: FilaAlerta[] = [];
  if (resultado.alertas.length > 0) {
    alertasCreadas = await db
      .insert(alertas)
      .values(
        ordenarPorSeveridad(resultado.alertas).map((alerta) => ({
          evaluacionId: ev.id,
          tipo: alerta.tipo,
          titulo: alerta.titulo,
          mensaje: alerta.mensaje,
          severidad: alerta.severidad,
          regla: alerta.regla,
          fenofase: alerta.fenofase ?? null,
          datosUtilizados: alerta.datosUtilizados,
          fuente: alerta.fuente,
          vigenciaHasta: alerta.vigenciaHasta ?? null,
        })),
      )
      .returning();
  }

  return aResultado(parcela, ev, alertasCreadas)!;
}

export type { FilaParcela, FilaEvaluacion, FilaAlerta };
