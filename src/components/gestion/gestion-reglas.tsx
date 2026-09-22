"use client";

import { useCallback, useEffect, useState } from "react";

interface Cultivo {
  id: string;
  slug: string;
  nameEs: string;
}

interface Estado {
  id: string;
  cropId: string;
  slug: string;
  nameEs: string;
}

interface Regla {
  id: string;
  code: string;
  riskType: string;
  name: string;
  description: string;
  cropId: string | null;
  phenologicalStateId: string | null;
  parameters: Record<string, unknown>;
  enabled: boolean;
  version: number;
}

const TIPOS_RIESGO = [
  "helada",
  "golpe-de-calor",
  "lluvia",
  "tormenta",
  "viento",
  "demanda-hidrica",
  "fitosanitario",
];

const claseInput =
  "w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-[13px] text-stone-800";

const FORM_VACIO = {
  code: "",
  riskType: "helada",
  name: "",
  description: "",
  cropId: "",
  phenologicalStateId: "",
  parameters: "{}",
  enabled: true,
  version: 1,
};

interface DatosGestion {
  cultivos: Cultivo[];
  reglas: Regla[];
}

async function cargarDatosRemotos(): Promise<DatosGestion> {
  const [rc, rr] = await Promise.all([
    fetch("/api/plataforma/cultivos", { cache: "no-store", credentials: "same-origin" }),
    fetch("/api/reglas?todas=1", { cache: "no-store", credentials: "same-origin" }),
  ]);
  if (!rc.ok || !rr.ok) throw new Error();
  return {
    cultivos: (await rc.json()) as Cultivo[],
    reglas: (await rr.json()) as Regla[],
  };
}

export function GestionReglas() {
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [form, setForm] = useState({ ...FORM_VACIO });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Record<string, unknown>[]>([]);

  const aplicarDatos = useCallback((datos: DatosGestion) => {
    setCultivos(datos.cultivos);
    setReglas(datos.reglas);
  }, []);

  useEffect(() => {
    let activo = true;
    cargarDatosRemotos()
      .then((datos) => {
        if (activo) aplicarDatos(datos);
      })
      .catch(() => {
        if (activo) setError("No se pudieron cargar los datos.");
      });
    return () => {
      activo = false;
    };
  }, [aplicarDatos]);

  async function cambiarCultivo(cropId: string) {
    setForm((previo) => ({
      ...previo,
      cropId,
      phenologicalStateId: "",
    }));
    if (!cropId) {
      setEstados([]);
      return;
    }
    try {
      const resp = await fetch(
        `/api/plataforma/estados-fenologicos?cropId=${cropId}`,
        { cache: "no-store" },
      );
      setEstados(resp.ok ? ((await resp.json()) as Estado[]) : []);
    } catch {
      setEstados([]);
    }
  }

  function editar(regla: Regla) {
    setEditandoId(regla.id);
    setForm({
      code: regla.code,
      riskType: regla.riskType,
      name: regla.name,
      description: regla.description,
      cropId: regla.cropId ?? "",
      phenologicalStateId: regla.phenologicalStateId ?? "",
      parameters: JSON.stringify(regla.parameters ?? {}, null, 2),
      enabled: regla.enabled,
      version: regla.version,
    });
    void fetch(`/api/reglas/${regla.id}/historial`, { credentials: "same-origin" })
      .then((resp) => resp.ok ? resp.json() as Promise<Record<string, unknown>[]> : [])
      .then(setHistorial)
      .catch(() => setHistorial([]));
    if (regla.cropId) void cambiarCultivo(regla.cropId);
  }

  function limpiar() {
    setEditandoId(null);
    setForm({ ...FORM_VACIO });
    setEstados([]);
    setHistorial([]);
  }

  async function guardar() {
    setError(null);
    setMensaje(null);
    let parameters: Record<string, unknown>;
    try {
      parameters = JSON.parse(form.parameters || "{}") as Record<string, unknown>;
      if (!parameters || Array.isArray(parameters) || typeof parameters !== "object") throw new Error();
      if (form.parameters.length > 10000) throw new Error();
    } catch {
      setError("Los parámetros deben ser un objeto JSON válido de menos de 10.000 caracteres.");
      return;
    }
    const cuerpo = {
      code: form.code.trim(),
      riskType: form.riskType,
      name: form.name.trim(),
      description: form.description.trim(),
      cropId: form.cropId || null,
      phenologicalStateId: form.phenologicalStateId || null,
      parameters,
      enabled: form.enabled,
      version: Number(form.version) || 1,
    };
    if (!cuerpo.code || !cuerpo.name) {
      setError("Código y nombre son obligatorios.");
      return;
    }
    try {
      const resp = await fetch(
        editandoId ? `/api/reglas/${editandoId}` : "/api/reglas",
        {
          method: editandoId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(cuerpo),
        },
      );
      if (!resp.ok) throw new Error();
      setMensaje(editandoId ? "Regla actualizada." : "Regla creada.");
      limpiar();
      aplicarDatos(await cargarDatosRemotos());
    } catch {
      setError("No se pudo guardar la regla (¿código duplicado?).");
    }
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Seguro que quieres eliminar esta regla? Esta acción no se puede deshacer.")) return;
    setError(null);
    try {
      const resp = await fetch(`/api/reglas/${id}`, { method: "DELETE", credentials: "same-origin" });
      if (!resp.ok) throw new Error();
      aplicarDatos(await cargarDatosRemotos());
    } catch {
      setError("No se pudo eliminar la regla.");
    }
  }

  function nombreCultivo(id: string | null): string {
    if (!id) return "Global";
    return cultivos.find((c) => c.id === id)?.nameEs ?? "Cultivo";
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-800">Reglas por cultivo</h2>
      <p className="mt-1 text-[12px] text-stone-500">
        Cada tipo de riesgo usa la regla más específica (estado fenológico &gt;
        cultivo &gt; global).
      </p>
      {editandoId && historial.length > 0 ? <details className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3"><summary className="cursor-pointer text-[13px] font-semibold text-stone-700">Versiones anteriores ({historial.length})</summary><ul className="mt-2 space-y-2 text-[12px] text-stone-600">{historial.map((version) => <li key={String(version.id)} className="rounded border border-stone-200 bg-white p-2">{String(version.action)} · {new Date(String(version.createdAt)).toLocaleString("es-ES")} · versión {String((version.snapshot as { version?: unknown }).version ?? "—")}</li>)}</ul></details> : null}

      {mensaje ? (
        <p className="mt-3 text-[13px] font-medium text-emerald-700">{mensaje}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-[11px] text-stone-500">Código</label>
          <input
            className={claseInput}
            maxLength={80}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="helada__almendro"
          />
        </div>
        <div>
          <label className="text-[11px] text-stone-500">Tipo de riesgo</label>
          <select
            className={claseInput}
            value={form.riskType}
            onChange={(e) => setForm({ ...form, riskType: e.target.value })}
          >
            {TIPOS_RIESGO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-stone-500">Nombre</label>
          <input
            className={claseInput}
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[11px] text-stone-500">Cultivo</label>
          <select
            className={claseInput}
            value={form.cropId}
            onChange={(e) => void cambiarCultivo(e.target.value)}
          >
            <option value="">Global</option>
            {cultivos.map((cultivo) => (
              <option key={cultivo.id} value={cultivo.id}>
                {cultivo.nameEs}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-stone-500">
            Estado fenológico
          </label>
          <select
            className={claseInput}
            value={form.phenologicalStateId}
            onChange={(e) =>
              setForm({ ...form, phenologicalStateId: e.target.value })
            }
            disabled={!form.cropId}
          >
            <option value="">Todos</option>
            {estados.map((estado) => (
              <option key={estado.id} value={estado.id}>
                {estado.nameEs}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-stone-500">Versión</label>
          <input
            type="number"
            className={claseInput}
            value={form.version}
            onChange={(e) =>
              setForm({ ...form, version: Number(e.target.value) })
            }
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] text-stone-500">Descripción</label>
          <input
            className={claseInput}
            maxLength={500}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] text-stone-500">
            Parámetros (JSON)
          </label>
          <textarea
            className={`${claseInput} h-28 font-mono`}
             maxLength={10000}
             value={form.parameters}
            onChange={(e) => setForm({ ...form, parameters: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-[12px] text-stone-600">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="h-4 w-4 accent-brand-700"
          />
          Activa
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={guardar}
            className="rounded-xl bg-brand-800 px-4 py-2 text-[13px] font-semibold text-white"
          >
             {editandoId ? "Actualizar regla" : "Crear regla"}
          </button>
          {editandoId ? (
            <button
              type="button"
              onClick={limpiar}
              className="text-[13px] font-medium text-stone-500"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-2 border-t border-stone-100 pt-4">
        {reglas.map((regla) => (
          <li
            key={regla.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2"
          >
            <div>
              <p className="text-[13px] font-medium text-stone-700">
                {regla.code}
                <span className="ml-2 text-[11px] font-normal text-stone-400">
                  {regla.riskType} · {nombreCultivo(regla.cropId)} · v
                  {regla.version}
                </span>
              </p>
              <p className="text-[11px] text-stone-400">
                {regla.name}
                {regla.enabled ? "" : " · (desactivada)"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => editar(regla)}
                className="text-[12px] font-medium text-brand-800"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => eliminar(regla.id)}
                className="text-[12px] font-medium text-red-600"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {reglas.length === 0 ? (
          <li className="text-[12px] text-stone-400">Sin reglas.</li>
        ) : null}
      </ul>
    </section>
  );
}
