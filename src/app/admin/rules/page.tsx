"use client";
import { useState, useEffect } from "react";
export default function AdminRulesPage() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState<string | null>(null);
  async function load() {
    setErr(null);
    try {
      const r = await fetch("/api/reglas", { headers: { "x-admin-secret": secret } });
      if (!r.ok) throw new Error((await r.json()).error);
      const j = await r.json() as Record<string, unknown>[];
      setData(j);
    } catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  }
  useEffect(()=>{ fetch("/api/reglas").then(r=>r.json().then(j=>setData(Array.isArray(j)?j:[])).catch(()=>{})); },[]);
  return <div className="mx-auto max-w-3xl p-4"><h1 className="text-xl font-bold">Reglas</h1><div className="mt-2 flex gap-2"><input value={secret} onChange={(e)=>setSecret(e.target.value)} placeholder="ADMIN_SECRET (opcional)" type="password" className="flex-1 rounded-xl border-2 border-stone-300 px-3 py-2" /><button onClick={load} className="rounded-xl bg-stone-900 px-4 py-2 text-white">Recargar</button></div>{err && <p className="mt-2 text-sm text-red-700">{err}</p>}<div className="mt-4 overflow-x-auto rounded-xl border-2 border-stone-200"><table className="w-full text-sm"><thead className="bg-stone-900 text-white"><tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Enabled</th></tr></thead><tbody className="divide-y">{data.map((r,i)=><tr key={i}><td className="px-3 py-2">{String((r as Record<string, unknown>).code)}</td><td className="px-3 py-2">{String((r as Record<string, unknown>).risk_type ?? (r as Record<string, unknown>).riskType)}</td><td className="px-3 py-2">{String((r as Record<string, unknown>).enabled)}</td></tr>)}</tbody></table></div></div>;
}
