export type UbicacionGuardada = {
  lat: number;
  lon: number;
  nombre: string;
  province?: string;
  aemetMunicipio?: string;
};

function limpiarUbicacionGuardada() {
  try {
    window.localStorage.removeItem("tecrural:ubicacion");
    window.localStorage.removeItem("tecrural:zona");
  } catch {}
}

export function leerUbicacionGuardada(): UbicacionGuardada | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("tecrural:ubicacion");
    if (!raw) {
      limpiarUbicacionGuardada();
      return null;
    }
    const ubicacion = JSON.parse(raw) as Partial<UbicacionGuardada>;
    if (
      typeof ubicacion.lat !== "number" || !Number.isFinite(ubicacion.lat) ||
      typeof ubicacion.lon !== "number" || !Number.isFinite(ubicacion.lon) ||
      typeof ubicacion.nombre !== "string" || !ubicacion.nombre.trim()
    ) {
      limpiarUbicacionGuardada();
      return null;
    }
    return { ...ubicacion, nombre: ubicacion.nombre.trim() } as UbicacionGuardada;
  } catch {
    limpiarUbicacionGuardada();
    return null;
  }
}

export function municipioDeUbicacion(nombre: string): string {
  return nombre.split(",")[0]?.trim() ?? "";
}
