"use client";
import { useState } from "react";

type Suscrito = {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  marketing_consent: boolean | null;
  privacy_version: string | null;
  consent_version: string | null;
  consent_timestamp: string | null;
  creado_en: string | null;
  score: number;
  clasificacion: string;
  ultima_actividad: string | null;
  parcelas: number;
  cultivos: string[] | null;
  municipio: string | null;
  eventos_recientes: { tipo: string; fecha: string; puntos: number }[] | null;
  total_eventos: number;
  notificaciones: number;
  alertas_generadas: number;
  preferencias: { pushEnabled: boolean; emailEnabled: boolean; whatsappEnabled: boolean; telegramEnabled: boolean } | null;
  origen: string;
};

export default function AdminSuscritosPage() {
  const [q, setQ] = useState("");
  const [datos, setDatos] = useState<Suscrito[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  async function buscar() {
    setCargando(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      qs.set("limit", "100");
      const r = await fetch(`/api/admin/suscritos?${qs.toString()}`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${r.status}`);
      }
      const j = (await r.json()) as { suscritos: Suscrito[] };
      setDatos(j.suscritos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <header className="rounded-2xl border-2 border-stone-900 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-extrabold text-stone-900">Control de suscritos</h1>
        <p className="mt-1 text-sm font-medium text-stone-600">Todos los usuarios y contactos con teléfono: datos, consentimiento, parcelas, interacción y preferencias.</p>
      </header>

      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, email, teléfono o municipio" className="min-h-[48px] flex-1 rounded-xl border-2 border-stone-300 px-4 py-3 text-base" />
        <button onClick={buscar} disabled={cargando} className="min-h-[48px] rounded-xl bg-stone-900 px-6 py-3 text-base font-bold text-white hover:bg-black disabled:opacity-60">
          {cargando ? "Buscando…" : "Buscar"}
        </button>
      </div>
      {error ? <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border-2 border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-900 text-white">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Municipio</th>
              <th className="px-3 py-2">Parcelas</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Eventos</th>
              <th className="px-3 py-2">Última actividad</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {datos.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-sm text-stone-600">Sin resultados. Pulsa Buscar.</td></tr>
            ) : datos.map((s) => (
              <>
                <tr key={s.id} className="hover:bg-stone-50">
                  <td className="px-3 py-2 font-semibold">{s.nombre ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{[s.email, s.telefono].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-3 py-2">{s.municipio ?? "—"}</td>
                  <td className="px-3 py-2 text-center">{s.parcelas}</td>
                  <td className="px-3 py-2 text-center font-bold">{s.score}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-stone-900 px-2 py-1 text-xs font-bold text-white">{s.clasificacion}</span></td>
                  <td className="px-3 py-2 text-center">{s.total_eventos}</td>
                  <td className="px-3 py-2 text-xs">{s.ultima_actividad ? new Date(s.ultima_actividad).toLocaleString("es-ES") : "—"}</td>
                  <td className="px-3 py-2 text-xs"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${s.origen === "contacto" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-700"}`}>{s.origen}</span></td>
                  <td className="px-3 py-2"><button onClick={() => setExpandido(expandido === s.id ? null : s.id)} className="rounded-lg border border-stone-300 bg-white px-3 py-1 text-xs font-bold hover:bg-stone-50">{expandido === s.id ? "Ocultar" : "Ver"}</button></td>
                </tr>
                {expandido === s.id ? (
                  <tr key={`${s.id}-detalle`} className="bg-stone-50">
                    <td colSpan={10} className="px-4 py-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-stone-200 bg-white p-3">
                          <h3 className="text-sm font-bold text-stone-900">Datos</h3>
                          <ul className="mt-2 space-y-1 text-sm text-stone-700">
                            <li><span className="font-semibold">ID:</span> <span className="font-mono text-xs">{s.id}</span></li>
                            <li><span className="font-semibold">Email:</span> {s.email ?? "—"}</li>
                            <li><span className="font-semibold">Teléfono:</span> {s.telefono ?? "—"}</li>
                            <li><span className="font-semibold">Creado:</span> {s.creado_en ? new Date(s.creado_en).toLocaleString("es-ES") : "—"}</li>
                            <li><span className="font-semibold">Marketing:</span> {s.marketing_consent ? "Sí" : "No"}</li>
                            <li><span className="font-semibold">Consentimiento:</span> {s.consent_version ?? "—"} {s.consent_timestamp ? `· ${new Date(s.consent_timestamp).toLocaleString("es-ES")}` : ""}</li>
                            <li><span className="font-semibold">Privacidad:</span> {s.privacy_version ?? "—"}</li>
                            <li><span className="font-semibold">Parcelas:</span> {s.parcelas} {s.cultivos?.length ? `· ${s.cultivos.join(", ")}` : ""}</li>
                            <li><span className="font-semibold">Alertas generadas:</span> {s.alertas_generadas} · <span className="font-semibold">Notificaciones:</span> {s.notificaciones}</li>
                          </ul>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-white p-3">
                          <h3 className="text-sm font-bold text-stone-900">Interacción con la app</h3>
                          {s.preferencias ? (
                            <p className="mt-2 text-xs text-stone-700">Preferencias: Push {s.preferencias.pushEnabled ? "✓" : "—"} · Email {s.preferencias.emailEnabled ? "✓" : "—"} · WhatsApp {s.preferencias.whatsappEnabled ? "✓" : "—"} · Telegram {s.preferencias.telegramEnabled ? "✓" : "—"}</p>
                          ) : <p className="mt-2 text-xs text-stone-500">Sin preferencias guardadas.</p>}
                          <p className="mt-2 text-xs font-semibold text-stone-700">Eventos recientes ({s.total_eventos} total):</p>
                          {s.eventos_recientes?.length ? (
                            <ul className="mt-1 space-y-1">
                              {s.eventos_recientes.map((e, i) => (
                                <li key={i} className="flex justify-between rounded bg-stone-50 px-2 py-1 text-xs"><span>{e.tipo}</span><span className="text-stone-500">{new Date(e.fecha).toLocaleDateString("es-ES")} {e.puntos ? `(+${e.puntos})` : ""}</span></li>
                              ))}
                            </ul>
                          ) : <p className="mt-1 text-xs text-stone-500">Sin eventos registrados.</p>}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
