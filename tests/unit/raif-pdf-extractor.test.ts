import { describe, expect, it } from "vitest";
import PDFDocument from "pdfkit";
import { extraerPdfRaif, extraerRecomendacion } from "@/lib/raif/pdf-extractor";

function pdfDeTexto(texto: string): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const documento = new PDFDocument();
    const partes: Buffer[] = [];
    documento.on("data", (parte: Buffer) => partes.push(parte));
    documento.on("end", () => {
      const total = Buffer.concat(partes);
      resolve(total.buffer.slice(total.byteOffset, total.byteOffset + total.byteLength));
    });
    documento.text(texto);
    documento.end();
  });
}

describe("extractor PDF RAIF", () => {
  it("extrae texto nativo, hash y recomendación sin usar OCR", async () => {
    const resultado = await extraerPdfRaif(await pdfDeTexto("Aviso fitosanitario de almendro en Granada. Se recomienda revisar la parcela antes de actuar y observar la presencia de daños durante los próximos días. Esta información oficial debe interpretarse junto con el seguimiento del cultivo y las indicaciones técnicas."));
    expect(resultado.status).toBe("native");
    expect(resultado.text).toContain("Aviso fitosanitario de almendro");
    expect(resultado.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(extraerRecomendacion(resultado.text)).toContain("Se recomienda");
  });
});
