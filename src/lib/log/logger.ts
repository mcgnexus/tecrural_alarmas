import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export type Nivel = "debug" | "info" | "warn" | "error";

export interface ContextoLog {
  request_id?: string;
  external_source?: string;
  user_id?: string;
  plot_id?: string;
}

interface ExtraLog {
  message?: string;
  status?: number;
  duracion_ms?: number;
  request_id?: string;
  external_source?: string;
  user_id?: string;
  plot_id?: string;
  data?: Record<string, unknown>;
}

const almacen = new AsyncLocalStorage<ContextoLog>();

/** Ejecuta `fn` con un contexto de log (típicamente el request_id) asociado. */
export function conContextoLog<T>(ctx: ContextoLog, fn: () => T): T {
  const previo = almacen.getStore();
  return almacen.run({ ...previo, ...ctx }, fn);
}

export function nuevoRequestId(): string {
  return randomUUID();
}

const CLAVES_SENSIBLES =
  /password|passwd|secret|token|authorization|api[_-]?key|connection|credential|bearer|cookie|session/i;

function esSensible(clave: string): boolean {
  return CLAVES_SENSIBLES.test(clave);
}

/** Copia defensiva: nunca deja pasar posibles secretos a los logs. */
export function redactar(valor: unknown, profundidad = 0): unknown {
  if (profundidad > 4 || valor === null || typeof valor !== "object") {
    return valor;
  }
  if (Array.isArray(valor)) {
    return valor.map((v) => redactar(v, profundidad + 1));
  }
  const salida: Record<string, unknown> = {};
  for (const [clave, v] of Object.entries(valor)) {
    salida[clave] = esSensible(clave) ? "[redactado]" : redactar(v, profundidad + 1);
  }
  return salida;
}

function escribir(nivel: Nivel, modulo: string, evento: string, extra: ExtraLog = {}, error?: unknown): void {
  const contexto = almacen.getStore() ?? {};
  const entrada: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: nivel,
    module: modulo,
    event: evento,
  };

  const mensaje =
    extra.message ??
    (error instanceof Error ? error.message : undefined);
  if (mensaje !== undefined) entrada.message = mensaje;
  if (error instanceof Error) {
    entrada.error = {
      name: error.name,
      code: error.name,
      message: error.message,
    };
  }

  for (const clave of [
    "request_id",
    "external_source",
    "user_id",
    "plot_id",
  ] as const) {
    const v = extra[clave] ?? contexto[clave];
    if (v !== undefined) entrada[clave] = v;
  }
  if (extra.status !== undefined) entrada.status = extra.status;
  if (extra.duracion_ms !== undefined) entrada.duracion_ms = extra.duracion_ms;
  if (extra.data !== undefined) entrada.data = redactar(extra.data);

  // Línea JSON única en stdout; consumible por cualquier recolector de logs.
  process.stdout.write(`${JSON.stringify(entrada)}\n`);
}

export interface Log {
  debug(evento: string, extra?: ExtraLog, error?: unknown): void;
  info(evento: string, extra?: ExtraLog, error?: unknown): void;
  warn(evento: string, extra?: ExtraLog, error?: unknown): void;
  error(evento: string, extra?: ExtraLog, error?: unknown): void;
}

export function crearLogger(modulo: string): Log {
  return {
    debug(e, x, err) {
      escribir("debug", modulo, e, x, err);
    },
    info(e, x, err) {
      escribir("info", modulo, e, x, err);
    },
    warn(e, x, err) {
      escribir("warn", modulo, e, x, err);
    },
    error(e, x, err) {
      escribir("error", modulo, e, x, err);
    },
  };
}

export const logSistema = crearLogger("sistema");