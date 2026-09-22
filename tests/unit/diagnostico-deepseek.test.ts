import { afterEach, describe, expect, it, vi } from "vitest";
import { diagnosticarConDeepSeek } from "@/lib/diagnostico/proveedor";

describe("adaptador DeepSeek Vision", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_BASE_URL;
    delete process.env.DEEPSEEK_VISION_MODEL;
  });

  it("envía una imagen como bloque image_url al modelo visual y valida la respuesta", async () => {
    process.env.DEEPSEEK_API_KEY = "clave-ficticia";
    process.env.DEEPSEEK_BASE_URL = "https://vision.example.test";
    process.env.DEEPSEEK_VISION_MODEL = "deepseek-flash";
    const llamada = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        summary: "Se observan manchas foliares.",
        hypotheses: ["Posible enfermedad fúngica"],
        recommendations: ["Consultar una muestra con un técnico."],
        confidence: "medium",
      }) } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", llamada);

    const resultado = await diagnosticarConDeepSeek({
      imageData: "data:image/jpeg;base64,ZmFrZQ==",
      crop: "olivar",
      phone: "+34600000000",
    });

    const init = llamada.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { model: string; messages: Array<{ role: string; content: Array<{ type: string; image_url?: { url: string; detail: string } }> }> };
    expect(body.model).toBe("deepseek-flash");
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toContainEqual({ type: "image_url", image_url: { url: "data:image/jpeg;base64,ZmFrZQ==", detail: "auto" } });
    expect(resultado.confidence).toBe("medium");
    expect(resultado.disclaimer).toContain("técnico agrícola");
  });
});
