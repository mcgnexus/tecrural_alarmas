"use client";

import { useEffect, useState } from "react";
import { TablaLeads } from "@/components/admin/tabla-leads";

type Stats = {
  usuarios: number;
  parcelas: number;
  activos7: number;
  activos30: number;
  leads: { frios: number; templados: number; calientes: number };
  solicitudes: number;
  alertas: { tipo: string; total: number }[];
  cultivos: { nombre: string; total: number }[];
  municipios: { nombre: string; total: number }[];
  ctas: { tipo: string; total: number }[];
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cargarStats() {
    const r = await fetch("/api/admin/stats", { cache: "no-store" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error ?? `HTTP ${r.status}`);
    }
    setStats((await r.json()) as Stats);
  }

  // Al abrir /admin, si ya hay sesión en cookie, entra sin pedir el secreto.
  useEffect(() => {
    let activo = true;
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ autenticado?: boolean }>)
      .then(async (j) => {
        if (!activo) return;
        if (j.autenticado) {
          setAutenticado(true);
          try {
            await cargarStats();
          } catch (e) {
            if (activo) setError(e instanceof Error ? e.message : "Error");
          }
        } else {
          setAutenticado(false);
        }
      })
      .catch(() => { if (activo) setAutenticado(false); });
    return () => { activo = false; };
  }, []);

  async function entrar() {
    if (!secret.trim()) {
      setError("Introduce el secreto de administrador.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      // Canjea el secreto por una sesión (cookie HttpOnly con token revocable).
      const sesion = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secret.trim() }),
      });
      if (!sesion.ok) {
        const j = await sesion.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${sesion.status}`);
      }
      setSecret("");
      setAutenticado(true);
      await cargarStats();
      const destino = new URLSearchParams(window.location.search).get("next");
      if (destino && destino.startsWith("/")) window.location.assign(destino);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }

  async function salir() {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    setStats(null);
    setAutenticado(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="rounded-2xl border-2 border-stone-900 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-extrabold text-stone-900">/admin — Panel interno TecRural</h1>
        <p className="mt-1 text-sm font-medium text-stone-600">Solo administradores. Requiere ADMIN_SECRET.</p>
      </header>

      {autenticado ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-900">Sesión de administración activa.</p>
          <button onClick={salir} className="min-h-[44px] shrink-0 rounded-xl border-2 border-stone-900 bg-white px-4 py-2 text-sm font-bold text-stone-900 hover:bg-stone-50">
            Cerrar sesión
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
          <label className="text-sm font-bold text-stone-900">Secreto administrador</label>
          <div className="mt-2 flex gap-2">
            <input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              type="password"
              placeholder="ADMIN_SECRET"
              className="min-h-[48px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base font-medium"
            />
            <button onClick={entrar} disabled={cargando} className="min-h-[48px] shrink-0 rounded-xl bg-stone-900 px-5 py-3 text-base font-bold text-white hover:bg-black disabled:opacity-60">
              {cargando ? "Cargando…" : "Entrar"}
            </button>
          </div>
        </div>
      )}
      {error ? <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}

      {stats ? (
        <div className="grid gap-4">
          <section className="grid grid-cols-2 gap-3">
            <Kpi label="Usuarios" value={stats.usuarios} />
            <Kpi label="Parcelas" value={stats.parcelas} />
            <Kpi label="Activos 7d" value={stats.activos7} />
            <Kpi label="Activos 30d" value={stats.activos30} />
          </section>

          <section className="rounded-2xl border-2 border-stone-200 bg-white p-5">
            <h2 className="text-base font-bold text-stone-900">Leads</h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Kpi label="Fríos" value={stats.leads.frios} sub="6–15 pts" />
              <Kpi label="Templados" value={stats.leads.templados} sub="16–30 pts" />
              <Kpi label="Calientes" value={stats.leads.calientes} sub="31+ pts" />
            </div>
          </section>

          <Kpi label="Solicitudes comerciales" value={stats.solicitudes} />

          <Lista titulo="Alertas más consultadas" items={stats.alertas.map((a) => ({ nombre: a.tipo, total: a.total }))} />
          <Lista titulo="Cultivos" items={stats.cultivos.map((c) => ({ nombre: c.nombre, total: c.total }))} />
          <Lista titulo="Municipios" items={stats.municipios.map((m) => ({ nombre: m.nombre, total: m.total }))} />
          <Lista titulo="CTAs más pulsados" items={stats.ctas.map((c) => ({ nombre: c.tipo, total: c.total }))} />
          <TablaLeads />
          <a href="/admin/suscritos" className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-5 py-4 text-center text-base font-bold text-emerald-900 hover:bg-emerald-100">
            Ver control de suscritos — datos, consentimiento, parcelas e interacción
          </a>
          <a href="/admin/users" className="rounded-2xl border-2 border-olive-700 bg-wheat-50 px-5 py-4 text-center text-base font-bold text-olive-900 hover:bg-olive-100">
            Gestionar usuarios, solicitudes recibidas y planes de suscripción
          </a>
          <a
            href="/gestion"
            className="rounded-2xl border-2 border-brand-800 bg-brand-50 px-5 py-4 text-center text-base font-bold text-brand-900 hover:bg-brand-100"
          >
            Ir a Gestión (catálogo, Kc y reglas de riesgo)
          </a>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border-2 border-stone-200 bg-white p-4 text-center shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-stone-600">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-stone-900">{value}</p>
      {sub ? <p className="text-xs font-medium text-stone-500">{sub}</p> : null}
    </div>
  );
}

function Lista({ titulo, items }: { titulo: string; items: { nombre: string; total: number }[] }) {
  return (
    <section className="rounded-2xl border-2 border-stone-200 bg-white p-5">
      <h2 className="text-base font-bold text-stone-900">{titulo}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-stone-600">Sin datos.</p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-200 rounded-xl border-2 border-stone-200">
          {items.map((it) => (
            <li key={it.nombre} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-stone-900">{it.nombre}</span>
              <span className="rounded-full bg-stone-900 px-3 py-1 text-sm font-bold text-white">{it.total}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
