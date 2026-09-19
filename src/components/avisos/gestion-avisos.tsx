"use client";

import { useCallback, useEffect, useState } from "react";
import { useParcelas } from "@/hooks/use-parcelas";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { SuscripcionDto } from "@/lib/datos/tipos";
import type { Canal } from "@/lib/notificaciones/tipos";
import type { Severidad } from "@/lib/alertas/tipos";

const CANALES: { id: Canal; etiqueta: string; ayuda: string }[] = [
  { id: "telegram", etiqueta: "Telegram", ayuda: "Chat ID que te da el bot" },
  { id: "email", etiqueta: "Correo", ayuda: "tu@correo.com" },
  { id: "whatsapp", etiqueta: "WhatsApp", ayuda: "+34600000000" },
  { id: "push", etiqueta: "Push del móvil", ayuda: "Actívalo en este dispositivo" },
  { id: "log", etiqueta: "Registro (pruebas)", ayuda: "Solo para desarrollo" },
];

const SEVERIDADES: { id: Severidad; etiqueta: string }[] = [
  { id: "info", etiqueta: "Información" },
  { id: "aviso", etiqueta: "Aviso" },
  { id: "alerta", etiqueta: "Alerta" },
  { id: "critica", etiqueta: "Crítico" },
];

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(normal);
  const salida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i += 1) {
    salida[i] = bruto.charCodeAt(i);
  }
  return salida;
}

async function cargarAvisosRemotos(): Promise<SuscripcionDto[]> {
  await asegurarSesionDispositivo();
  const dispositivo = obtenerDispositivoId();
  const resp = await fetch(
    `/api/avisos?dispositivo=${encodeURIComponent(dispositivo)}`,
    { cache: "no-store" },
  );
  if (!resp.ok) throw new Error();
  return (await resp.json()) as SuscripcionDto[];
}

export function GestionAvisos() {
  const { parcelas } = useParcelas();
  const [avisos, setAvisos] = useState<SuscripcionDto[]>([]);
  const [canal, setCanal] = useState<Canal>("telegram");
  const [destino, setDestino] = useState("");
  const [parcelaId, setParcelaId] = useState("");
  const [severidad, setSeveridad] = useState<Severidad>("aviso");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Health check de push: null = comprobando, false = no configurado en el servidor.
  const [pushDisponible, setPushDisponible] = useState<boolean | null>(null);

  useEffect(() => {
    let activo = true;
    fetch("/api/avisos/push/clave")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { disponible?: boolean } | null) => {
        if (activo) setPushDisponible(Boolean(j?.disponible));
      })
      .catch(() => {
        if (activo) setPushDisponible(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    try {
      setAvisos(await cargarAvisosRemotos());
      setError(null);
    } catch {
      setError("No se pudieron cargar tus avisos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    cargarAvisosRemotos()
      .then((datos) => {
        if (!activo) return;
        setAvisos(datos);
        setError(null);
      })
      .catch(() => {
        if (!activo) return;
        setError("No se pudieron cargar tus avisos.");
      })
      .finally(() => {
        if (!activo) return;
        setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  async function crear(datos: { canal: Canal; destino: string }) {
    await asegurarSesionDispositivo();
    setGuardando(true);
    setError(null);
    try {
      const resp = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispositivoId: obtenerDispositivoId(),
          parcelaId: parcelaId || null,
          canal: datos.canal,
          destino: datos.destino,
          severidadMinima: severidad,
        }),
      });
      if (!resp.ok) throw new Error();
      setDestino("");
      await cargar();
    } catch {
      setError("No se pudo guardar el aviso. Revisa los datos.");
    } finally {
      setGuardando(false);
    }
  }

  async function agregar() {
    if (canal === "push" && pushDisponible === false) {
      setError("El canal push no está disponible ahora mismo.");
      return;
    }
    if (canal === "push") {
      await activarPush();
      return;
    }
    if (!destino.trim()) {
      setError("Indica el destino del aviso.");
      return;
    }
    await crear({ canal, destino: destino.trim() });
  }

  async function activarPush() {
    await asegurarSesionDispositivo();
    setGuardando(true);
    setError(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("sin soporte push");
      }
      const registro = await navigator.serviceWorker.ready;
      const resp = await fetch("/api/avisos/push/clave");
      const { clavePublica } = (await resp.json()) as {
        clavePublica: string | null;
      };
      if (!clavePublica) throw new Error("push no configurado en el servidor");
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(clavePublica),
      });
      await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispositivoId: obtenerDispositivoId(),
          parcelaId: parcelaId || null,
          canal: "push",
          destino: JSON.stringify(suscripcion),
          severidadMinima: severidad,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error();
      });
      await cargar();
    } catch {
      setError("No se pudo activar el push en este dispositivo.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    await asegurarSesionDispositivo();
    setError(null);
    try {
      const dispositivo = obtenerDispositivoId();
      const resp = await fetch(
        `/api/avisos/${id}?dispositivo=${encodeURIComponent(dispositivo)}`,
        { method: "DELETE" },
      );
      if (!resp.ok) throw new Error();
      await cargar();
    } catch {
      setError("No se pudo eliminar el aviso.");
    }
  }

  const claseLabel = "mb-1 block text-xs font-medium text-stone-500";
  const claseCampo =
    "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800";

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-800">Nuevo aviso</h2>
        <p className="mt-1 text-[13px] text-stone-500">
          Recibe un mensaje cuando se active una alerta. Elige canal y gravedad
          mínima.
        </p>

        <div className="mt-3 grid gap-3">
          <div>
            <label className={claseLabel}>Canal</label>
            <select
              value={canal}
              onChange={(e) => setCanal(e.target.value as Canal)}
              disabled={guardando}
              className={claseCampo}
            >
              {CANALES.map((c) => {
                const noDisponible = c.id === "push" && pushDisponible === false;
                return (
                  <option key={c.id} value={c.id} disabled={noDisponible}>
                    {noDisponible ? `${c.etiqueta} (próximamente)` : c.etiqueta}
                  </option>
                );
              })}
            </select>
          </div>

          {canal === "push" && pushDisponible === false ? (
            <p className="text-[13px] font-medium text-amber-600">
              El aviso push no está configurado todavía. Elige otro canal.
            </p>
          ) : null}

          {canal !== "push" ? (
            <div>
              <label className={claseLabel}>Destino</label>
              <input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder={CANALES.find((c) => c.id === canal)?.ayuda}
                disabled={guardando}
                className={claseCampo}
              />
            </div>
          ) : null}

          <div>
            <label className={claseLabel}>Parcela</label>
            <select
              value={parcelaId}
              onChange={(e) => setParcelaId(e.target.value)}
              disabled={guardando}
              className={claseCampo}
            >
              <option value="">Todas mis parcelas</option>
              {parcelas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={claseLabel}>Gravedad mínima</label>
            <select
              value={severidad}
              onChange={(e) => setSeveridad(e.target.value as Severidad)}
              disabled={guardando}
              className={claseCampo}
            >
              {SEVERIDADES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={agregar}
            disabled={guardando}
            className="rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {guardando
              ? "Guardando…"
              : canal === "push"
                ? "Activar en este dispositivo"
                : "Añadir aviso"}
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-800">Tus avisos</h2>
        {cargando ? (
          <p className="mt-2 text-[13px] text-stone-500">Cargando…</p>
        ) : avisos.length === 0 ? (
          <p className="mt-2 text-[13px] text-stone-500">
            Todavía no tienes canales de aviso configurados.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {avisos.map((aviso) => (
              <li
                key={aviso.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-2"
              >
                <div>
                  <p className="text-[13px] font-medium text-stone-700">
                    {CANALES.find((c) => c.id === aviso.canal)?.etiqueta ??
                      aviso.canal}
                    {aviso.parcelaId ? "" : " · todas las parcelas"}
                  </p>
                  <p className="text-xs text-stone-400">
                    Gravedad mínima:{" "}
                    {SEVERIDADES.find((s) => s.id === aviso.severidadMinima)
                      ?.etiqueta ?? aviso.severidadMinima}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => eliminar(aviso.id)}
                  className="text-[13px] font-medium text-red-600"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
