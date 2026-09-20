const CLAVE = "tecrural.dispositivo";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `d-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function obtenerDispositivoId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(CLAVE);
  if (!id) {
    id = uuid();
    window.localStorage.setItem(CLAVE, id);
  }
  asegurarSesionDispositivo();
  return id;
}

let sesionEnCurso: Promise<void> | null = null;

/**
 * Registra el dispositivoId en el servidor para obtener la cookie de sesión
 * firmada (HttpOnly). Crea el identificador si aún no existe, de modo que
 * `await asegurarSesionDispositivo()` deja la cookie lista antes de cualquier
 * petición protegida. Se ejecuta una sola vez por carga de página.
 */
export function asegurarSesionDispositivo(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (sesionEnCurso) return sesionEnCurso;
  let id = window.localStorage.getItem(CLAVE);
  if (!id) {
    id = uuid();
    window.localStorage.setItem(CLAVE, id);
  }
  sesionEnCurso = fetch("/api/sesion/dispositivo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dispositivoId: id }),
    credentials: "same-origin",
  })
    .then(() => undefined)
    .catch(() => undefined);
  return sesionEnCurso;
}
