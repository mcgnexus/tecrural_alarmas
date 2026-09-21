"use client";

import { useCallback, useEffect, useState } from "react";


type UsuarioAdmin = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  score: number;
  classification: string | null;
  parcelas: number;
  consultas: number;
  created_at: string;
};

type Invitacion = { ruta: string; expiresAt: string };

function enlaceCompleto(ruta: string): string {
  if (typeof window === "undefined") return ruta;
  return `${window.location.origin}${ruta}`;
}

export default function AdminUsersPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [creando, setCreando] = useState(false);
  const [invitacion, setInvitacion] = useState<{ usuario: string; enlace: string } | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/admin/users", { cache: "no-store" });
      if (!r.ok) throw new Error(r.status === 401 ? "Inicia sesión en /admin." : "Error al cargar usuarios.");
      const j = (await r.json()) as { users: UsuarioAdmin[] };
      setUsuarios(j.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    let activo = true;
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "Inicia sesión en /admin." : "Error al cargar usuarios.");
        const j = (await r.json()) as { users: UsuarioAdmin[] };
        if (activo) setUsuarios(j.users);
      })
      .catch((e) => { if (activo) setError(e instanceof Error ? e.message : "Error"); });
    return () => { activo = false; };
  }, []);

  async function crear() {
    if (nombre.trim().length < 2) { setError("Indica al menos un nombre."); return; }
    setCreando(true); setError(null); setAviso(null);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), telefono: telefono.trim() || undefined, email: email.trim() || undefined }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; invitacion?: Invitacion };
      if (!r.ok || !j.invitacion) throw new Error(j.error ?? "No se pudo crear la cuenta.");
      setInvitacion({ usuario: nombre.trim(), enlace: enlaceCompleto(j.invitacion.ruta) });
      setNombre(""); setTelefono(""); setEmail("");
      setAviso("Cuenta creada. Envía el enlace de acceso por WhatsApp.");
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCreando(false);
    }
  }

  async function invitar(u: UsuarioAdmin) {
    setError(null); setAviso(null);
    try {
      const r = await fetch(`/api/admin/users/${u.id}/invite`, { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { error?: string; invitacion?: Invitacion };
      if (!r.ok || !j.invitacion) throw new Error(j.error ?? "No se pudo generar la invitación.");
      setInvitacion({ usuario: u.name ?? u.phone ?? "cuenta", enlace: enlaceCompleto(j.invitacion.ruta) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  async function borrar(u: UsuarioAdmin) {
    if (!window.confirm(`¿Borrar la cuenta de ${u.name ?? u.id}? Se anonimizarán sus consultas.`)) return;
    setError(null);
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo borrar.");
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">Usuarios y cuentas</h1>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-5">
        <h2 className="text-base font-bold text-stone-900">Crear cuenta (provisión manual)</h2>
        <p className="mt-1 text-sm text-stone-600">Al crearla se genera un enlace de acceso de un solo uso para enviar por WhatsApp.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3 text-sm" />
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono (opcional)" className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional)" className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3 text-sm" />
        </div>
        <button onClick={crear} disabled={creando} className="mt-3 min-h-[44px] rounded-xl bg-stone-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          {creando ? "Creando…" : "Crear cuenta e invitar"}
        </button>
        {aviso ? <p className="mt-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{aviso}</p> : null}
        {error ? <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}

        {invitacion ? (
          <div className="mt-3 rounded-xl border-2 border-olive-700 bg-wheat-50 p-3">
            <p className="text-sm font-bold text-stone-900">Enlace de acceso para {invitacion.usuario}</p>
            <p className="mt-1 break-all text-[13px] text-stone-700">{invitacion.enlace}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => void navigator.clipboard.writeText(invitacion.enlace)} className="min-h-[44px] rounded-xl border-2 border-stone-900 bg-white px-4 py-2 text-sm font-bold">Copiar enlace</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Hola ${invitacion.usuario}, este es tu acceso a TecRural: ${invitacion.enlace}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Enviar por WhatsApp</a>
            </div>
          </div>
        ) : null}
      </section>

      <section className="overflow-x-auto rounded-xl border-2 border-stone-200">
        <table className="w-full text-sm">
          <thead className="bg-stone-900 text-white">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Contacto</th>
              <th className="px-3 py-2">Parcelas</th>
              <th className="px-3 py-2">Consultas</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.name ?? "—"}</td>
                <td className="px-3 py-2">{u.phone ?? u.email ?? "—"}</td>
                <td className="px-3 py-2 text-center">{u.parcelas ?? 0}</td>
                <td className="px-3 py-2 text-center">{u.consultas ?? 0}</td>
                <td className="px-3 py-2 text-center">{u.score ?? 0}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => void invitar(u)} className="rounded-lg border-2 border-stone-900 px-2 py-1 text-xs font-bold">Invitar</button>
                    <button onClick={() => void borrar(u)} className="rounded-lg border-2 border-red-700 px-2 py-1 text-xs font-bold text-red-800">Borrar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
