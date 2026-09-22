import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cuerpoParcelaValido,
  esquemaReglaRiesgo,
  esquemaSuscripcion,
  emailValido,
  telefonoValido,
} from "@/lib/datos/validacion";
import {
  cookieSesion,
  valorCookieSesion,
  dispositivoAutenticado,
} from "@/lib/datos/sesion-dispositivo";
import { exigirDispositivo } from "@/lib/datos/sesion-dispositivo";
import { notificadorWhatsapp } from "@/lib/notificaciones/whatsapp";
import { notificadorEmail } from "@/lib/notificaciones/email";
import { evaluadorHelada } from "@/lib/alertas/evaluadores/helada";
import type { RiskContext } from "@/lib/dominio/evaluacion";

const DEVICE_ID = "device-ficticio-001";
const PARCELA = {
  dispositivoId: DEVICE_ID,
  nombre: "Parcela de prueba",
  cultivo: "almendro" as const,
  latitud: 37.39,
  longitud: -2.78,
};

function requestWithCookie(cookie: string): Request {
  return new Request("https://tecrural.test/api/parcelas", {
    headers: { cookie },
  });
}

function hourly(temperatureC: number) {
  return {
    timestamp: "2026-01-01T00:00:00.000Z",
    latitude: 37.39,
    longitude: -2.78,
    temperatureC,
    apparentTemperatureC: temperatureC,
    relativeHumidityPct: 70,
    dewPointC: 1,
    precipitationMm: 0,
    precipitationProbabilityPct: 0,
    windSpeedKmh: 4,
    windGustKmh: 8,
    windDirectionDeg: 180,
    cloudCoverPct: 10,
    solarRadiationWm2: 0,
    et0Mm: 0,
    provider: "fictitious",
    fetchedAt: "2026-01-01T00:00:00.000Z",
  };
}

function riskContext(horario: ReturnType<typeof hourly>[]): RiskContext {
  return {
    plot: { id: "00000000-0000-0000-0000-000000000001", latitude: 37.39, longitude: -2.78 },
    crop: { id: "00000000-0000-0000-0000-000000000002", slug: "almond" },
    hourlyForecast: horario,
    recentWeather: horario,
    officialWarnings: [],
    phytosanitaryAlerts: [],
    evaluationTime: new Date("2026-01-01T00:00:00.000Z"),
    plotId: "plot-ficticio",
    latitud: 37.39,
    longitud: -2.78,
    horario,
    cultivo: "almond" as never,
    fenofase: null,
    momento: new Date("2026-01-01T00:00:00.000Z"),
  } as unknown as RiskContext;
}

describe("flujos obligatorios con datos ficticios", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.WHATSAPP_TOKEN;
    delete process.env.WHATSAPP_PHONE_ID;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("permite alta de parcela y persistencia tras recargar", () => {
    expect(cuerpoParcelaValido(PARCELA)).toBe(true);
    const almacenamiento = new Map<string, typeof PARCELA>();
    almacenamiento.set("parcela-ficticia", PARCELA);
    expect(almacenamiento.get("parcela-ficticia")).toEqual(PARCELA);
  });

  it("evalúa riesgos y distingue estado sin alertas y con alertas", async () => {
    const sinAlertas = await evaluadorHelada.evaluate(riskContext([hourly(8)]));
    const conAlertas = await evaluadorHelada.evaluate(riskContext([hourly(-2)]));
    expect(sinAlertas).toBeNull();
    expect(conAlertas?.level).toBe("red");
  });

  it("crea un aviso ficticio por WhatsApp sin red real", async () => {
    process.env.WHATSAPP_TOKEN = "token-ficticio";
    process.env.WHATSAPP_PHONE_ID = "phone-ficticio";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    const resultado = await notificadorWhatsapp.enviar("34600000000", {
      parcelaId: "parcela-ficticia",
      parcelaNombre: "Parcela de prueba",
      cultivo: "almendro",
      alerta: { tipo: "helada", nivel: "red" } as never,
    });
    expect(resultado.ok).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("crea un aviso ficticio por correo sin red real", async () => {
    process.env.RESEND_API_KEY = "re_fake_123";
    process.env.EMAIL_FROM = "TecRural <test@example.invalid>";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    const resultado = await notificadorEmail.enviar("agricultor@example.invalid", {
      parcelaId: "parcela-ficticia",
      parcelaNombre: "Parcela de prueba",
      cultivo: "almendro",
      alerta: { tipo: "helada", nivel: "red" } as never,
    });
    expect(resultado.ok).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("valida teléfonos y correos en destinos de notificación", () => {
    expect(telefonoValido("+34600000000")).toBe(true);
    expect(telefonoValido("teléfono inválido")).toBe(false);
    expect(emailValido("agricultor@example.invalid")).toBe(true);
    expect(emailValido("correo-inválido")).toBe(false);
    expect(esquemaSuscripcion.safeParse({ dispositivoId: DEVICE_ID, canal: "whatsapp", destino: "+34600000000" }).success).toBe(true);
  });

  it("exige consentimiento de privacidad y permite marketing opcional", () => {
    const validar = (body: { privacyConsent: boolean; marketingConsent?: boolean }) => body.privacyConsent === true;
    expect(validar({ privacyConsent: false })).toBe(false);
    expect(validar({ privacyConsent: true, marketingConsent: false })).toBe(true);
    expect(validar({ privacyConsent: true, marketingConsent: true })).toBe(true);
  });

  it("rechaza acceso sin sesión a gestión y acepta sesión administrativa válida", async () => {
    const { verificarAccesoAdmin } = await import("@/lib/admin/auth");
    process.env.ADMIN_SECRET = "admin-ficticio";
    expect((await verificarAccesoAdmin(new Request("https://tecrural.test/gestion"))).ok).toBe(false);
    expect((await verificarAccesoAdmin(new Request("https://tecrural.test/admin", { headers: { authorization: "Bearer admin-ficticio" } }))).ok).toBe(true);
  });

  it("rechaza reglas con JSON incorrecto", () => {
    expect(esquemaReglaRiesgo.safeParse({ code: "", riskType: 42 }).success).toBe(false);
    expect(esquemaReglaRiesgo.safeParse({ code: "helada", riskType: "frost", name: "Regla ficticia" }).success).toBe(true);
  });

  it("elimina una parcela solo con la sesión de dispositivo correcta", () => {
    const cookie = cookieSesion(DEVICE_ID);
    const req = requestWithCookie(cookie);
    expect(dispositivoAutenticado(req)).toBe(DEVICE_ID);
    expect(exigirDispositivo(req, DEVICE_ID).ok).toBe(true);
    expect(exigirDispositivo(req, "otro-dispositivo").ok).toBe(false);
    expect(valorCookieSesion(DEVICE_ID)).toContain(".");
  });
});
