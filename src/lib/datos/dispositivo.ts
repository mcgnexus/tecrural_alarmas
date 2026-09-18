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
  return id;
}