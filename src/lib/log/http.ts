import type { NextResponse } from "next/server";
import { conContextoLog, nuevoRequestId } from "./logger";
import type { ContextoLog } from "./logger";

/** Genera un request_id, lo asocia al contexto de log y lo entrega al handler. */
export function conRequestId<T>(
  ctx: ContextoLog,
  fn: (requestId: string) => Promise<T>,
): Promise<T> {
  const requestId = nuevoRequestId();
  return Promise.resolve(
    conContextoLog({ request_id: requestId, ...ctx }, () => fn(requestId)),
  );
}

export function conCabeceraRequestId(
  respuesta: NextResponse,
  requestId: string,
): NextResponse {
  respuesta.headers.set("x-request-id", requestId);
  return respuesta;
}
