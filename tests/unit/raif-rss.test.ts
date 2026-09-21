import { describe, expect, it } from "vitest";
import { normalizarRaifItem, parsearRaifRss } from "@/lib/raif/rss";

describe("ingesta RSS de RAIF", () => {
  it("parsea campos RSS, contenido, PDF oficial y filtra PDF externo", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item>
      <title>Recomendaciones para el control de repilo en olivar</title>
      <link>https://pd-web-wp-raif.apps.paas-pro.junta-andalucia.es/aviso-repilo/</link>
      <guid isPermaLink="false">raif-123</guid>
      <pubDate>Tue, 15 Sep 2026 06:23:22 +0000</pubDate>
      <category><![CDATA[Actualidad Fitosanitaria]]></category><category><![CDATA[Olivar]]></category>
      <content:encoded><![CDATA[<p>La provincia de Granada y el municipio de Baza requieren seguimiento.</p>
        <a href="https://www.juntadeandalucia.es/agriculturapescaaguaydesarrollorural/raif/wp-content/uploads/repilo.pdf">PDF oficial</a>
        <a href="https://example.com/falso.pdf">PDF externo</a>]]></content:encoded>
    </item></channel></rss>`;

    const [item] = parsearRaifRss(xml);
    expect(item?.guid).toBe("raif-123");
    expect(item?.categories).toEqual(["Actualidad Fitosanitaria", "Olivar"]);
    const alerta = normalizarRaifItem(item!);
    expect(alerta.cropSlug).toBe("olive");
    expect(alerta.province).toBe("Granada");
    expect(alerta.municipality).toBe("Baza");
    expect(alerta.coverage).toBe("municipal");
    expect(alerta.pdfLinks).toHaveLength(1);
    expect(alerta.extractionStatus).toBe("pdf_pending");
    expect(alerta.severity).toBeNull();
  });

  it("no inventa municipio cuando el artículo solo menciona la provincia", () => {
    const alerta = normalizarRaifItem({
      guid: "raif-124",
      title: "Aviso fitosanitario provincial de Granada",
      link: "https://www.juntadeandalucia.es/raif/aviso",
      publishedAt: "2026-09-15T00:00:00.000Z",
      categories: ["Almendro"],
      contentEncoded: "<p>Información para la provincia de Granada.</p>",
    });
    expect(alerta.province).toBe("Granada");
    expect(alerta.municipality).toBeNull();
    expect(alerta.coverage).toBe("provincial");
  });
});
