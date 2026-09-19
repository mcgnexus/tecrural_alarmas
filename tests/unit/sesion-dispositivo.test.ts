import { describe, expect, it, beforeAll } from "vitest";
import {
  COOKIE_SESION,
  cookieSesion,
  dispositivoAutenticado,
  exigirDispositivo,
} from "@/lib/datos/sesion-dispositivo";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

function reqConCookie(valor: string): Request {
  return new Request("http://localhost/api/test", {
    headers: { cookie: valor },
  });
}

beforeAll(() => {
  process.env.DEVICE_SESSION_SECRET = "secreto-test";
});

describe("sesión de dispositivo firmada", () => {
  it("la cookie firmada autentica a su dispositivo", () => {
    const req = reqConCookie(`${COOKIE_SESION}=${ID_A}.firma-invalida`);
    expect(dispositivoAutenticado(req)).toBeNull();
  });

  it("rechaza una cookie con firma falsificada", () => {
    const req = reqConCookie(`${COOKIE_SESION}=${ID_A}.firma-invalida`);
    expect(dispositivoAutenticado(req)).toBeNull();
  });

  it("acepta la cookie emitida por el servidor", () => {
    const par = cookieSesion(ID_A).split(";")[0]!;
    expect(dispositivoAutenticado(reqConCookie(par))).toBe(ID_A);
  });

  it("exigirDispositivo: identidad A con su cookie es válida", () => {
    const par = cookieSesion(ID_A).split(";")[0]!;
    const res = exigirDispositivo(reqConCookie(par), ID_A);
    expect(res).toEqual({ ok: true, dispositivoId: ID_A });
  });

  it("IDOR: identidad A no puede actuar como B (cookie de A, id de B)", () => {
    const par = cookieSesion(ID_A).split(";")[0]!;
    const res = exigirDispositivo(reqConCookie(par), ID_B);
    expect(res).toMatchObject({ ok: false, status: 403 });
  });

  it("IDOR: identificador inventado sin sesión firmada se rechaza con 401", () => {
    const res = exigirDispositivo(new Request("http://localhost/api/test"), ID_B);
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it("sin cookie ni identificador se rechaza con 400", () => {
    const res = exigirDispositivo(new Request("http://localhost/api/test"), null);
    expect(res).toMatchObject({ ok: false, status: 400 });
  });

  it("la cookie de B no autentica a A", () => {
    const parB = cookieSesion(ID_B).split(";")[0]!;
    const res = exigirDispositivo(reqConCookie(parB), ID_A);
    expect(res).toMatchObject({ ok: false, status: 403 });
  });
});
