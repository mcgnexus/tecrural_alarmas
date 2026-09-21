"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { asegurarSesionDispositivo } from "@/lib/datos/dispositivo";

export default function LoginPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    let token = codigo.trim();
    // Acepta tanto el enlace completo como solo el token.
    const coincidencia = token.match(/[?&]token=([^&\s]+)/);
    if (coincidencia) token = decodeURIComponent(coincidencia[1]!);
    if (!token) {
      setError("Pega el enlace de acceso que te enviamos por WhatsApp.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      await asegurarSesionDispositivo();
      const r = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Enlace no válido o caducado.");
      router.push("/cuenta");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo acceder.");
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-extrabold text-stone-950">Acceso a tu cuenta</h1>
      <p className="text-[15px] text-stone-600">
        Tu cuenta se crea desde TecRural. Pega aquí el enlace de acceso que te enviamos por WhatsApp.
      </p>
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Pega el enlace o el código"
        className="min-h-[48px] rounded-xl border-2 border-stone-300 px-4 text-base"
      />
      <button onClick={entrar} disabled={cargando} className="min-h-[52px] rounded-xl bg-olive-800 px-5 py-3 text-base font-bold text-white disabled:opacity-60">
        {cargando ? "Entrando…" : "Entrar"}
      </button>
      {error ? <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-[15px] font-semibold text-red-800">{error}</p> : null}
      <Link href="/" className="font-bold text-olive-800 underline">Volver al inicio</Link>
    </div>
  );
}
