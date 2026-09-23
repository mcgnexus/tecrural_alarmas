"use client";

import { useCallback, useEffect, useState } from "react";


type UsuarioAdmin = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  score: number;
  classification: string | null;
  parcelas: number;
  consultas: number;
  created_at: string;
};

type Invitacion = { ruta: string; expiresAt: string };
type SolicitudTelefono = { id: string; nombre: string | null; telefono: string; creado_en: string; comentario: string | null; municipio: string | null; cultivo: string | null };
const PLANES = ["free", "essential", "monitor", "pro", "cooperative"] as const;
const NOMBRE_PLAN: Record<string, string> = { free: "Gratis", essential: "Esencial", monitor: "Monitor", pro: "Pro", cooperative: "Cooperativa" };

function enlaceCompleto(ruta: string): string {
  if (typeof window === "undefined") return ruta;
  return `${window.location.origin}${ruta}`;
}

export default function AdminUsersPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudTelefono[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [creando, setCreando] = useState(false);
  const [invitacion, setInvitacion] = useState<{ usuario: string; enlace: string } | null>(null);
  const [plan, setPlan] = useState("free");
  const [planSolicitud, setPlanSolicitud] = useState("free");
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/admin/users", { cache: "no-store" });
      if (!r.ok) throw new Error(r.status === 401 ? "Inicia sesión en /admin." : "Error al cargar usuarios.");
      const j = (await r.json()) as { users: UsuarioAdmin[]; solicitudes: SolicitudTelefono[] };
      setUsuarios(j.users);
      setSolicitudes(j.solicitudes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    let activo = true;
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "Inicia sesión en /admin." : "Error al cargar usuarios.");
        const j = (await r.json()) as { users: UsuarioAdmin[]; solicitudes: SolicitudTelefono[] };
        if (activo) { setUsuarios(j.users); setSolicitudes(j.solicitudes ?? []); }
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
        body: JSON.stringify({ nombre: nombre.trim(), telefono: telefono.trim() || undefined, email: email.trim() || undefined, plan }),
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

  async function guardarUsuario() {
    if (!editando) return;
    setGuardando(true); setError(null); setAviso(null);
    try {
      const r = await fetch(`/api/admin/users/${editando.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: editando.name ?? "", telefono: editando.phone ?? "", email: editando.email ?? "", plan: editando.plan }) });
      const j = await r.json().catch(() => ({})) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "No se pudo actualizar la cuenta.");
      setEditando(null); setAviso("Cuenta actualizada."); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setGuardando(false); }
  }

  async function convertirSolicitud(s: SolicitudTelefono) {
    setError(null); setAviso(null);
    try {
      const r = await fetch(`/api/admin/leads/${s.id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: planSolicitud }) });
      const j = await r.json().catch(() => ({})) as { error?: string; user?: { name: string }; invitacion?: Invitacion };
      if (!r.ok || !j.invitacion) throw new Error(j.error ?? "No se pudo crear la cuenta.");
      setInvitacion({ usuario: j.user?.name ?? s.nombre ?? s.telefono, enlace: enlaceCompleto(j.invitacion.ruta) });
      setAviso("Solicitud convertida en cuenta. Comparte el enlace de acceso por WhatsApp.");
      await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
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
        <label className="mt-3 block text-sm font-bold" htmlFor="plan-nueva-cuenta">Plan de suscripción</label>
        <select id="plan-nueva-cuenta" value={plan} onChange={(e) => setPlan(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-xl border-2 border-stone-300 px-3 text-sm sm:max-w-xs">{PLANES.map((p) => <option key={p} value={p}>{NOMBRE_PLAN[p]}</option>)}</select>
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

      <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
        <h2 className="text-base font-bold text-stone-900">Solicitudes de contacto con teléfono</h2>
        <p className="mt-1 text-sm text-stone-700">Contactos que recibiste por Telegram. Al convertir uno se crea la cuenta, se vincula la solicitud y se genera un enlace de acceso.</p>
        <label htmlFor="plan-solicitudes" className="mt-3 block text-sm font-bold">Plan inicial</label>
        <select id="plan-solicitudes" value={planSolicitud} onChange={(e) => setPlanSolicitud(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-xl border-2 border-stone-300 bg-white px-3 text-sm sm:max-w-xs">{PLANES.map((p) => <option key={p} value={p}>{NOMBRE_PLAN[p]}</option>)}</select>
        {solicitudes.length ? <div className="mt-3 grid gap-2">{solicitudes.map((s) => <article key={s.id} className="rounded-xl border border-amber-200 bg-white p-3 sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="font-bold text-stone-900">{s.nombre || "Sin nombre"} · {s.telefono}</p><p className="text-sm text-stone-600">{[s.municipio, s.cultivo, s.comentario].filter(Boolean).join(" · ") || "Sin más detalles"}</p><p className="text-xs text-stone-500">{new Date(s.creado_en).toLocaleDateString("es-ES")}</p></div><button onClick={() => void convertirSolicitud(s)} className="mt-2 min-h-[44px] rounded-xl bg-olive-800 px-4 py-2 text-sm font-bold text-white sm:mt-0">Crear cuenta y generar enlace</button></article>)}</div> : <p className="mt-3 text-sm text-stone-600">No hay solicitudes pendientes con teléfono.</p>}
      </section>

      {editando ? <section className="rounded-2xl border-2 border-brand-700 bg-brand-50 p-5"><h2 className="font-bold">Editar cuenta</h2><div className="mt-3 grid gap-2 sm:grid-cols-2"><input aria-label="Nombre" value={editando.name ?? ""} onChange={(e) => setEditando({ ...editando, name: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3" placeholder="Nombre"/><input aria-label="Teléfono" value={editando.phone ?? ""} onChange={(e) => setEditando({ ...editando, phone: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3" placeholder="Teléfono"/><input aria-label="Email" value={editando.email ?? ""} onChange={(e) => setEditando({ ...editando, email: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3" placeholder="Email"/><select aria-label="Plan" value={editando.plan ?? "free"} onChange={(e) => setEditando({ ...editando, plan: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3">{PLANES.map((p) => <option key={p} value={p}>{NOMBRE_PLAN[p]}</option>)}</select></div><div className="mt-3 flex gap-2"><button onClick={() => void guardarUsuario()} disabled={guardando} className="min-h-[44px] rounded-xl bg-brand-800 px-4 font-bold text-white">{guardando ? "Guardando…" : "Guardar cambios"}</button><button onClick={() => setEditando(null)} className="min-h-[44px] rounded-xl border-2 border-stone-400 px-4 font-bold">Cancelar</button></div></section> : null}

      <section className="overflow-x-auto rounded-xl border-2 border-stone-200">
        <table className="w-full text-sm">
          <thead className="bg-stone-900 text-white">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Contacto</th>
              <th className="px-3 py-2">Plan</th>
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
                <td className="px-3 py-2 text-center">{NOMBRE_PLAN[u.plan] ?? NOMBRE_PLAN.free}</td>
                <td className="px-3 py-2 text-center">{u.parcelas ?? 0}</td>
                <td className="px-3 py-2 text-center">{u.consultas ?? 0}</td>
                <td className="px-3 py-2 text-center">{u.score ?? 0}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => void invitar(u)} className="rounded-lg border-2 border-stone-900 px-2 py-1 text-xs font-bold">Invitar</button>
                    <button onClick={() => setEditando({ ...u })} className="rounded-lg border-2 border-brand-700 px-2 py-1 text-xs font-bold text-brand-900">Editar</button>
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
