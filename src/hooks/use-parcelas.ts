"use client";

import { useCallback, useEffect, useState } from "react";
import {
  asegurarSesionDispositivo,
  obtenerDispositivoId,
} from "@/lib/datos/dispositivo";
import type { ParcelaDto } from "@/lib/datos/tipos";

async function cargarParcelasRemotas(): Promise<ParcelaDto[]> {
  const dispositivo = obtenerDispositivoId();
  // La cookie de sesión firmada debe existir antes de la primera llamada.
  await asegurarSesionDispositivo();
  const resp = await fetch(
    `/api/parcelas?dispositivo=${encodeURIComponent(dispositivo)}`,
    { cache: "no-store" },
  );
  if (!resp.ok) throw new Error("Servicio no disponible");
  return (await resp.json()) as ParcelaDto[];
}

export function useParcelas() {
  const [parcelas, setParcelas] = useState<ParcelaDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    cargarParcelasRemotas()
      .then((datos) => {
        if (!activo) return;
        setParcelas(datos);
        setError(null);
      })
      .catch(() => {
        if (!activo) return;
        setError("No se pudieron cargar tus parcelas.");
      })
      .finally(() => {
        if (!activo) return;
        setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const refrescar = useCallback(async () => {
    try {
      const datos = await cargarParcelasRemotas();
      setParcelas(datos);
      setError(null);
    } catch {
      setError("No se pudieron cargar tus parcelas.");
    } finally {
      setCargando(false);
    }
  }, []);

  return { parcelas, cargando, error, refrescar };
}