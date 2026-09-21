import { beforeEach, describe, expect, it } from "vitest";
import {
  COOKIE_USUARIO,
  usuarioAutenticado,
  valorCookieUsuario,
} from "@/lib/datos/sesion-usuario";

const ID = "550e8400-e29b-41d4-a716-446655440000";

function peticionConCookie(valor: string): Request {
  return new Request("http://test/", {
    headers: { cookie: `${COOKIE_USUARIO}=${valor}` },
  });
}

describe("sesión de cuenta firmada", () => {
  beforeEach(() => {
    process.env.DEVICE_SESSION_SECRET = "secreto-sesion-de-prueba";
  });

  it("reconoce una cookie bien firmada", () => {
    expect(usuarioAutenticado(peticionConCookie(valorCookieUsuario(ID)))).toBe(ID);
  });

  it("rechaza una firma manipulada", () => {
    const manipulado = valorCookieUsuario(ID).replace(/.$/, "x");
    expect(usuarioAutenticado(peticionConCookie(manipulado))).toBeNull();
  });

  it("rechaza un id que no es uuid", () => {
    expect(usuarioAutenticado(peticionConCookie(valorCookieUsuario("no-uuid")))).toBeNull();
  });

  it("devuelve null si no hay cookie", () => {
    expect(usuarioAutenticado(new Request("http://test/"))).toBeNull();
  });
});
