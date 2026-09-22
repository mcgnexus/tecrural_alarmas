import { resultadoDiagnostico, type ResultadoDiagnostico } from "./contrato";

const DISCLAIMER = "Orientación visual no concluyente. Confirma el diagnóstico con un técnico agrícola antes de aplicar tratamientos.";

function contenidoRespuesta(payload: unknown): string {
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

function extraerJson(texto: string): unknown {
  const limpio = texto.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) throw new Error("Respuesta de diagnóstico no estructurada.");
  return JSON.parse(limpio.slice(inicio, fin + 1));
}

export async function diagnosticarConDeepSeek(input: {
  imageData: string;
  crop: string;
  phone: string;
  notes?: string;
}): Promise<ResultadoDiagnostico> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) throw new Error("Diagnóstico visual no configurado.");
  const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.DEEPSEEK_VISION_MODEL?.trim() || "deepseek-flash";
  const respuesta = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Analiza esta imagen de una planta de ${input.crop}. ${input.notes ?? ""} Devuelve SOLO JSON con summary, hypotheses (array), recommendations (array), confidence (low|medium|high). No inventes certeza ni recetas.` },
          { type: "image_url", image_url: { url: input.imageData, detail: "auto" } },
        ],
      }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!respuesta.ok) throw new Error(`Proveedor de diagnóstico HTTP ${respuesta.status}`);
  const datos = await respuesta.json() as unknown;
  const extraido = extraerJson(contenidoRespuesta(datos));
  const parseado = resultadoDiagnostico.safeParse({
    ...(extraido && typeof extraido === "object" ? extraido : {}),
    disclaimer: DISCLAIMER,
  });
  if (!parseado.success) throw new Error("Respuesta de diagnóstico no válida.");
  return parseado.data;
}
