import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verificarSecretoAdmin } from "@/lib/admin/auth";

const PREVIO = process.env.ADMIN_SECRET;

describe("admin: verificación del secreto maestro", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "secreto-de-prueba";
  });
  afterEach(() => {
    if (PREVIO === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = PREVIO;
  });

  it("acepta el secreto correcto", () => {
    expect(verificarSecretoAdmin("secreto-de-prueba").ok).toBe(true);
  });

  it("rechaza un secreto incorrecto", () => {
    const r = verificarSecretoAdmin("otro");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("rechaza secreto vacío", () => {
    expect(verificarSecretoAdmin("").ok).toBe(false);
  });

  it("devuelve 503 si no hay ADMIN_SECRET configurado", () => {
    delete process.env.ADMIN_SECRET;
    const r = verificarSecretoAdmin("lo-que-sea");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(503);
  });
});
