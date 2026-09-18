import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { schema } from "./schema";
import { logSistema } from "@/lib/log/logger";

const globalConPg = globalThis as unknown as {
  tecruralPool?: pg.Pool;
  tecruralDb?: ReturnType<typeof construirDb>;
};

function construirPool(): pg.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL en el entorno.");
  }
  const pool = new pg.Pool({
    connectionString: url,
    ssl:
      url.includes("sslmode=require") || url.includes("sslmode=verify-full")
        ? { rejectUnauthorized: false }
        : undefined,
    max: 5,
  });
  pool.on("error", (error) => {
    logSistema.error("db.pool.error", {}, error);
  });
  return pool;
}

function construirDb() {
  const pool = globalConPg.tecruralPool ?? (globalConPg.tecruralPool = construirPool());
  return drizzle(pool, { schema });
}

export function obtenerDb() {
  globalConPg.tecruralDb ??= construirDb();
  return globalConPg.tecruralDb;
}