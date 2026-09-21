"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { asegurarSesionDispositivo } from "@/lib/datos/dispositivo";

type Estado = "cargando" | "ok" | "error";

export default function AccesoPage() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;
    async function activar() {
      try {
        // Deja lista la cookie de dispositivo para vincular sus datos anónimos.
        await asegurarSesionDispositivo();
        const token = new URLSearchParams(window.location.search).get("token") ?? "";
        if (!token) {
          if (activo) { setEstado("error"); setMensaje("Falta el enlace de acceso."); }
          return;
        }
        const r = await fetch("/api/auth/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ token }),
        });
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        if (!activo) return;
        if (!r.ok) {
          setEstado("error");
          setMensaje(j.error ?? "No se pudo activar la cuenta.");
          return;
        }
        setEstado("ok");
      } catch {
        if (activo) { setEstado("error"); setMensaje("No se pudo activar la cuenta."); }
      }
    }
    void activar();
    return () => { activo = false; };
  }, []);

  return (
    <section className="mx-auto w-full max-w-xl rounded-2xl border-2 border-olive-700 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-extrabold text-stone-950">Acceso a tu cuenta</h1>

      {estado === "cargando" ? (
        <p className="mt-3 text-[15px] text-stone-600">Activando tu acceso…</p>
      ) : null}

      {estado === "ok" ? (
        <>
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-[15px] font-semibold text-emerald-900">
            Cuenta activada. Ya tienes tus consultas y parcelas guardadas.
          </p>
          <Link href="/cuenta" className="mt-4 inline-flex min-h-[52px] items-center justify-center rounded-xl bg-olive-800 px-5 py-3 text-base font-bold text-white">
            Ver mi cuenta
          </Link>
        </>
      ) : null}

      {estado === "error" ? (
        <>
          <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-[15px] font-semibold text-red-800">
            {mensaje} Pide un enlace nuevo por WhatsApp.
          </p>
          <Link href="/" className="mt-4 inline-flex min-h-[52px] items-center font-bold text-olive-800 underline">
            Volver al inicio
          </Link>
        </>
      ) : null}
    </section>
  );
}
