import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { parsearCapXml } from "@/lib/proveedores/aemet";

const XML_CAP = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>Z_CAP_C_LEMM_20260919093050_AFAZ611103COCO2110</identifier>
  <info>
    <language>es</language>
    <event>Aviso de lluvias</event>
    <severity>Moderate</severity>
    <onset>2026-09-19T12:00:00-00:00</onset>
    <expires>2026-09-19T23:59:59-00:00</expires>
    <headline>Aviso de lluvias de nivel amarillo</headline>
    <description>Precipitación acumulada de 20 mm en una hora &amp; posible granizo.</description>
    <area>
      <areaDesc>Vega del Genil</areaDesc>
    </area>
  </info>
</alert>`;

describe("AEMET CAP XML", () => {
  it("extrae los campos CAP y desescapa entidades XML", () => {
    const avisos = parsearCapXml(XML_CAP);
    expect(avisos).toHaveLength(1);
    const a = avisos[0]!;
    expect(a.provider).toBe("aemet");
    expect(a.phenomenon).toBe("Aviso de lluvias");
    expect(a.severity).toBe("moderate");
    expect(a.area).toBe("Vega del Genil");
    expect(a.headline).toBe("Aviso de lluvias de nivel amarillo");
    expect(a.description).toContain("20 mm en una hora & posible granizo");
    expect(a.startsAt).toContain("2026-09-19T12:00");
  });

  it("devuelve [] si no hay alertas", () => {
    expect(parsearCapXml("<x/>")).toEqual([]);
  });
});

function capConArea(area: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>Z_CAP_C_LEMM_20260919093050_${area.replace(/\s+/g, "")}</identifier>
  <info>
    <event>Aviso de vientos</event>
    <severity>Moderate</severity>
    <onset>2026-09-20T11:00:00-00:00</onset>
    <expires>2026-09-21T05:59:00-00:00</expires>
    <headline>Aviso de vientos de nivel amarillo</headline>
    <area><areaDesc>${area}</areaDesc></area>
  </info>
</alert>`;
}

function crearTar(nombre: string, contenido: Buffer): Buffer {
  const header = Buffer.alloc(512);
  header.write(nombre, 0, "latin1");
  header.write(contenido.length.toString(8).padStart(11, "0"), 124, "latin1");
  const relleno = (512 - (contenido.length % 512)) % 512;
  return Buffer.concat([header, contenido, Buffer.alloc(relleno)]);
}

function mockAvisosTar(areaBuffer: Buffer): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ estado: 200, datos: "https://x/tar" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array(areaBuffer), {
          status: 200,
          headers: { "content-type": "application/x-gtar" },
        }),
      ),
  );
}

describe("AEMET: avisos CAP por zona", () => {
  beforeAll(() => {
    process.env.AEMET_API_KEY = "test-key";
    process.env.AEMET_CAP_AREA = "61";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("decodifica el XML CAP como UTF-8 (Campiña, no CampiÃ±a)", async () => {
    const tar = crearTar(
      "611102.xml",
      Buffer.from(capConArea("Campiña gaditana"), "utf8"),
    );
    mockAvisosTar(tar);

    const { proveedorAemet } = await import("@/lib/proveedores/aemet");
    const avisos = await proveedorAemet.getWarnings!({
      latitud: 36.5,
      longitud: -6.0,
    });

    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.area).toBe("Campiña gaditana");
  });

  it("descarta los avisos de otras zonas del municipio seleccionado", async () => {
    const tar = Buffer.concat([
      crearTar(
        "611102.xml",
        Buffer.from(capConArea("Campiña gaditana"), "utf8"),
      ),
      crearTar(
        "611802.xml",
        Buffer.from(capConArea("Guadix y Baza"), "utf8"),
      ),
    ]);
    mockAvisosTar(tar);

    const { proveedorAemet } = await import("@/lib/proveedores/aemet");
    const avisos = await proveedorAemet.getWarnings!({
      latitud: 37.4897,
      longitud: -2.7735,
    });

    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.area).toBe("Guadix y Baza");
  });
});
