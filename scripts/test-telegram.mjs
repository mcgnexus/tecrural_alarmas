/**
 * Prueba de punta a punta del aviso a Telegram de "nuevo suscriptor".
 *
 * Uso:  npm run test:telegram
 *
 * Qué hace:
 *  1. Valida el bot de Telegram (getMe).
 *  2. Arranca el servidor Next en un puerto libre (o usa TECRURAL_BASE_URL).
 *  3. Crea una suscripción real vía POST /api/avisos (con cookie de dispositivo
 *     firmada, igual que el navegador).
 *  4. Comprueba que el servidor registró el envío a Telegram (`negocio.telegram.ok`).
 *  5. Borra la suscripción de prueba y para el servidor.
 *
 * Requiere en .env o .env.local:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID_NEGOCIO y el secreto de sesión
 *   (DEVICE_SESSION_SECRET o INTERNAL_SECRET/ADMIN_SECRET).
 *
 * Si termina en OK, revisa tu Telegram: debe haber llegado el aviso.
 */
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = Number(process.env.TELEGRAM_TEST_PORT ?? 3100);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
const chatId = (process.env.TELEGRAM_CHAT_ID_NEGOCIO ?? "").trim();
if (!token || !chatId) {
  console.error(
    "Faltan credenciales: define TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID_NEGOCIO en .env o .env.local.",
  );
  process.exit(1);
}

function secretoSesion() {
  return (
    process.env.DEVICE_SESSION_SECRET ||
    process.env.INTERNAL_SECRET ||
    process.env.ADMIN_SECRET ||
    "tecrural-dev-insecure-secret"
  );
}

function cookieDispositivo(dispositivoId) {
  const firma = createHmac("sha256", secretoSesion())
    .update(dispositivoId)
    .digest("base64url");
  return `tecrural_sesion=${dispositivoId}.${firma}`;
}

async function validarBot() {
  const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data?.ok) {
    throw new Error(`Token inválido: HTTP ${resp.status} ${JSON.stringify(data)}`);
  }
  return data.result;
}

/** Arranca `next dev` y espera a que /api/health responda. Devuelve un limpiador. */
async function arrancarServidor() {
  const base = process.env.TECRURAL_BASE_URL?.replace(/\/$/, "");
  if (base) {
    console.log(`Usando servidor existente: ${base}`);
    return { base, log: () => "", detener: async () => {} };
  }

  const nextBin = path.join(raiz, "node_modules", "next", "dist", "bin", "next");
  const url = `http://localhost:${PUERTO}`;
  console.log(`Arrancando Next en ${url} …`);
  const hijo = spawn(process.execPath, [nextBin, "dev", "-p", String(PUERTO)], {
    cwd: raiz,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let salida = "";
  hijo.stdout.on("data", (d) => { salida += d.toString(); });
  hijo.stderr.on("data", (d) => { salida += d.toString(); });

  const detener = async () => {
    if (hijo.exitCode !== null) return;
    if (process.platform === "win32") {
      await new Promise((r) =>
        spawn("taskkill", ["/pid", String(hijo.pid), "/T", "/F"], { stdio: "ignore" }).on("close", r),
      );
    } else {
      hijo.kill("SIGTERM");
    }
  };

  const limite = Date.now() + 120_000;
  while (Date.now() < limite) {
    if (hijo.exitCode !== null) {
      throw new Error(`El servidor se cerró. Salida:\n${salida.slice(-2000)}`);
    }
    try {
      const r = await fetch(`${url}/api/health`);
      if (r.ok) return { base: url, log: () => salida, detener };
    } catch {
      /* aún no está listo */
    }
    await esperar(1000);
  }
  await detener();
  throw new Error(`El servidor no arrancó en 120 s. Salida:\n${salida.slice(-2000)}`);
}

async function main() {
  const bot = await validarBot();
  console.log(`Bot: @${bot.username} (${bot.first_name}) → chat ${chatId}`);

  const { base, log, detener } = await arrancarServidor();
  const dispositivoId = `e2e-telegram-${Date.now()}`;
  const cookie = cookieDispositivo(dispositivoId);
  let suscripcionId = null;

  try {
    const resp = await fetch(`${base}/api/avisos`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        dispositivoId,
        parcelaId: null,
        canal: "log",
        destino: "prueba-e2e@tecrural",
        severidadMinima: "info",
      }),
    });
    const aviso = await resp.json().catch(() => null);
    if (!resp.ok) {
      throw new Error(
        `POST /api/avisos falló: HTTP ${resp.status} ${JSON.stringify(aviso)}`,
      );
    }
    suscripcionId = aviso?.id ?? null;
    console.log(`Suscripción creada: ${suscripcionId ?? "(sin id)"} (canal ${aviso?.canal})`);

    // El servidor registra `negocio.telegram.ok` cuando Telegram acepta el envío.
    const registrado = log().includes("negocio.telegram.ok");
    if (registrado) {
      console.log("OK — el servidor confirmó el envío a Telegram (negocio.telegram.ok).");
    } else if (process.env.TECRURAL_BASE_URL) {
      console.log(
        "Aviso enviado vía API. No se pueden leer los logs del servidor externo; revisa tu Telegram.",
      );
    } else {
      console.warn(
        "ATENCIÓN — la API respondió 201 pero no se vio 'negocio.telegram.ok' en los logs.",
      );
    }
    console.log("Revisa tu Telegram: debe aparecer «🔔 Nuevo suscriptor de avisos».");
  } finally {
    if (suscripcionId) {
      await fetch(
        `${base}/api/avisos/${suscripcionId}?dispositivo=${encodeURIComponent(dispositivoId)}`,
        { method: "DELETE", headers: { cookie } },
      ).catch(() => {});
      console.log("Suscripción de prueba eliminada.");
    }
    await detener();
  }
}

main().catch((error) => {
  console.error("FALLO:", error instanceof Error ? error.message : error);
  process.exit(1);
});
