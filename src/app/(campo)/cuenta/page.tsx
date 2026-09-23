"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { asegurarSesionDispositivo } from "@/lib/datos/dispositivo";
import { EMAIL_CONTACTO, enlaceWhatsapp } from "@/lib/config/contacto";

type Cuenta = {
  usuario: { id: string; nombre: string | null; email: string | null; telefono: string | null; creadoEl: string };
  consultas: { id: string; creadoEl: string; estado: string; comentario: string | null }[];
};

type Parcela = { id: string; nombre: string; cultivo: string; latitud: number; longitud: number };

function fecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CuentaPage() {
  const router = useRouter();
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json());
        if (!activo) return;
        if (!(me as { autenticado?: boolean }).autenticado) {
          setAutenticado(false);
          return;
        }
        setAutenticado(true);
        await asegurarSesionDispositivo();
        const [resumen, parcelasResp] = await Promise.all([
          fetch("/api/account/summary", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
          fetch("/api/parcelas", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
        ]);
        if (!activo) return;
        setCuenta(resumen as Cuenta | null);
        setParcelas(Array.isArray(parcelasResp) ? (parcelasResp as Parcela[]) : []);
      } catch {
        if (activo) setError("No pudimos cargar tu cuenta ahora mismo.");
      }
    }
    void cargar();
    return () => { activo = false; };
  }, []);

  async function borrar() {
    if (!window.confirm("¿Seguro que quieres borrar tu cuenta? Se eliminarán tus parcelas y se anonimizarán tus consultas.")) return;
    setBorrando(true);
    try {
      const r = await fetch("/api/account/delete", { method: "POST", credentials: "same-origin" });
      if (!r.ok) throw new Error();
      router.push("/");
    } catch {
      setError("No se pudo borrar la cuenta. Inténtalo más tarde.");
      setBorrando(false);
    }
  }

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    router.push("/");
  }

  if (autenticado === null) {
    return <p className="text-[15px] text-stone-600">Cargando tu cuenta…</p>;
  }

  if (!autenticado) {
    const enlaceAyudaWhatsapp = enlaceWhatsapp("Hola, he perdido el enlace de acceso a mi cuenta de TecRural. ¿Podéis ayudarme a recuperarlo?");
    return (
      <section className="mx-auto w-full max-w-xl rounded-2xl border-2 border-earth-300 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold text-stone-950">Mi cuenta</h1>
        <p className="mt-2 text-[15px] text-stone-700">
          Tu cuenta se activa con el enlace que te enviamos por WhatsApp. Si lo has perdido, escríbenos y te ayudaremos a recuperarlo.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {enlaceAyudaWhatsapp ? <a href={enlaceAyudaWhatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-olive-800 px-4 py-3 text-sm font-bold text-white">Pedir ayuda por WhatsApp</a> : null}
          <a href={`mailto:${EMAIL_CONTACTO}?subject=${encodeURIComponent("Recuperar acceso a mi cuenta TecRural")}`} className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-stone-300 px-4 py-3 text-sm font-bold text-stone-800">Escribir por correo</a>
        </div>
        <Link href="/" className="mt-4 inline-flex min-h-[52px] items-center font-bold text-olive-800 underline">
          Volver al inicio
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border-2 border-olive-700 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-extrabold text-stone-950">Mi cuenta</h1>
          <button onClick={salir} className="min-h-[44px] rounded-xl border-2 border-stone-900 bg-white px-4 py-2 text-sm font-bold text-stone-900">
            Cerrar sesión
          </button>
        </div>
        <p className="mt-2 text-[15px] font-semibold text-stone-800">{cuenta?.usuario.nombre ?? "Sin nombre"}</p>
        <p className="text-[14px] text-stone-600">
          {cuenta?.usuario.telefono ?? "—"} · {cuenta?.usuario.email ?? "Sin correo"}
        </p>
        <p className="mt-1 text-[13px] text-stone-500">Cuenta creada el {cuenta ? fecha(cuenta.usuario.creadoEl) : "—"}.</p>
      </section>

      {error ? <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-[15px] font-semibold text-red-800">{error}</p> : null}

      <section className="rounded-2xl border-2 border-earth-300 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-stone-950">Mis consultas</h2>
        {cuenta && cuenta.consultas.length > 0 ? (
          <ul className="mt-3 divide-y divide-stone-200 rounded-xl border-2 border-stone-200">
            {cuenta.consultas.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <p className="text-[15px] font-semibold text-stone-900">{c.comentario ?? "Consulta"}</p>
                <p className="text-[13px] text-stone-500">{fecha(c.creadoEl)} · {c.estado}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[15px] text-stone-600">Todavía no hay consultas guardadas.</p>
        )}
      </section>

      <section className="rounded-2xl border-2 border-earth-300 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-stone-950">Mis parcelas</h2>
        {parcelas.length > 0 ? (
          <ul className="mt-3 divide-y divide-stone-200 rounded-xl border-2 border-stone-200">
            {parcelas.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-[15px] font-semibold text-stone-900">{p.nombre}</span>
                <span className="text-[13px] text-stone-500">{p.cultivo}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[15px] text-stone-600">Todavía no hay parcelas guardadas.</p>
        )}
      </section>

      <section className="rounded-2xl border-2 border-stone-300 bg-stone-50 p-5">
        <h2 className="text-lg font-extrabold text-stone-950">Privacidad</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/account/export" className="inline-flex min-h-[48px] items-center rounded-xl border-2 border-stone-900 bg-white px-4 py-2 text-sm font-bold text-stone-900">
            Descargar mis datos
          </a>
          <button onClick={borrar} disabled={borrando} className="inline-flex min-h-[48px] items-center rounded-xl border-2 border-red-700 bg-white px-4 py-2 text-sm font-bold text-red-800 disabled:opacity-60">
            {borrando ? "Borrando…" : "Borrar mi cuenta"}
          </button>
        </div>
      </section>
    </div>
  );
}
