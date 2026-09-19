"use client";
import { useState } from "react";
export default function AdminAlertsPage() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState<string | null>(null);
  async function load() {
    setErr(null);
    try {
      const paths = ["/api/admin/riesgos", "/api/admin/eventos"];
      const r = await fetch(paths[0], { headers: { "x-admin-secret": secret } });
      if (!r.ok) throw new Error((await r.json()).error);
      const j = await r.json() as { riesgos: Record<string, unknown>[] };
      setData(j.riesgos);
    } catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  }
  return <div className="mx-auto max-w-3xl p-4"><h1 className="text-xl font-bold">Alertas / Riesgos</h1><div className="mt-2 flex gap-2"><input value={secret} onChange={(e)=>setSecret(e.target.value)} placeholder="ADMIN_SECRET" type="password" className="flex-1 rounded-xl border-2 border-stone-300 px-3 py-2" /><button onClick={load} className="rounded-xl bg-stone-900 px-4 py-2 text-white">Cargar</button></div>{err && <p className="mt-2 text-sm text-red-700">{err}</p>}<div className="mt-4 overflow-x-auto rounded-xl border-2 border-stone-200"><table className="w-full text-sm"><thead className="bg-stone-900 text-white"><tr><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Nivel</th><th className="px-3 py-2">Parcela</th><th className="px-3 py-2">Usuario</th></tr></thead><tbody className="divide-y">{data.map((r,i)=><tr key={i}><td className="px-3 py-2">{String(r.risk_type)}</td><td className="px-3 py-2">{String(r.level)}</td><td className="px-3 py-2">{String(r.parcela)}</td><td className="px-3 py-2">{String(r.usuario)}</td></tr>)}</tbody></table></div></div>;
}
