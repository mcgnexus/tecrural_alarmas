import { describe, expect, it } from "vitest";
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
