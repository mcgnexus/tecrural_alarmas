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
 * firmada (HttpOnly). Se ejecuta una sola vez por carga de página; las
 * autorizaciones posteriores las hace el servidor contra la cookie.
 */
export function asegurarSesionDispositivo(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (sesionEnCurso) return sesionEnCurso;
  const id = window.localStorage.getItem(CLAVE);
  if (!id) return Promise.resolve();
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
