"use client";

import { useCallback, useEffect, useState } from "react";

interface Cultivo {
  id: string;
  slug: string;
  nameEs: string;
  kc: number | null;
  kcValidated: boolean;
}

interface Estado {
  id: string;
  cropId: string;
  slug: string;
  nameEs: string;
  orderIndex: number;
  kc: number | null;
  kcValidated: boolean;
}

interface BorradorKc {
  kc: string;
  kcValidated: boolean;
}

const claseInput =
  "w-24 rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-800";

async function cargarCultivosRemotos(): Promise<Cultivo[]> {
  const resp = await fetch("/api/plataforma/cultivos", { cache: "no-store" });
  if (!resp.ok) throw new Error();
  return (await resp.json()) as Cultivo[];
}

export function GestionCatalogo() {
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [estados, setEstados] = useState<Record<string, Estado[]>>({});
  const [borradores, setBorradores] = useState<Record<string, BorradorKc>>({});
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aplicarCultivos = useCallback((datos: Cultivo[]) => {
    setCultivos(datos);
    setBorradores((previo) => {
      const siguiente = { ...previo };
      for (const cultivo of datos) {
        if (!siguiente[cultivo.id]) {
          siguiente[cultivo.id] = {
            kc: cultivo.kc === null ? "" : String(cultivo.kc),
            kcValidated: cultivo.kcValidated,
          };
        }
      }
      return siguiente;
    });
  }, []);

  useEffect(() => {
    let activo = true;
    cargarCultivosRemotos()
      .then((datos) => {
        if (activo) aplicarCultivos(datos);
      })
      .catch(() => {
        if (activo) setError("No se pudieron cargar los cultivos.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [aplicarCultivos]);

  async function cargarEstados(cropId: string) {
    const resp = await fetch(
      `/api/plataforma/estados-fenologicos?cropId=${cropId}`,
      { cache: "no-store" },
    );
    const lista = (await resp.json()) as Estado[];
    setEstados((previo) => ({ ...previo, [cropId]: lista }));
    setBorradores((previo) => {
      const siguiente = { ...previo };
      for (const estado of lista) {
        siguiente[estado.id] = {
          kc: estado.kc === null ? "" : String(estado.kc),
          kcValidated: estado.kcValidated,
        };
      }
      return siguiente;
    });
  }

  async function alternarEstados(cropId: string) {
    setError(null);
    const abrir = !abiertos[cropId];
    setAbiertos((previo) => ({ ...previo, [cropId]: abrir }));
    if (abrir && !estados[cropId]) {
      try {
        await cargarEstados(cropId);
      } catch {
        setError("No se pudieron cargar los estados fenológicos.");
      }
    }
  }

  function numeroOpcional(texto: string): number | null {
    const limpio = texto.trim();
    if (limpio === "") return null;
    const valor = Number(limpio);
    return Number.isFinite(valor) ? valor : null;
  }

  async function guardarKc(url: string, borrador: BorradorKc | undefined) {
    setError(null);
    setMensaje(null);
    try {
      const resp = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          kc: numeroOpcional(borrador?.kc ?? ""),
          kcValidated: borrador?.kcValidated ?? false,
        }),
      });
      if (!resp.ok) throw new Error();
      setMensaje("Guardado.");
    } catch {
      setError("No se pudo guardar.");
    }
  }

  async function cargarCatalogo() {
    setError(null);
    setMensaje(null);
    try {
      const resp = await fetch("/api/plataforma/catalogo/cargar", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!resp.ok) throw new Error();
      const resultado = (await resp.json()) as {
        cultivos: number;
        estados: number;
      };
      setMensaje(
        `Catálogo cargado: ${resultado.cultivos} cultivos, ${resultado.estados} estados (Kc sin validar).`,
      );
      setEstados({});
      aplicarCultivos(await cargarCultivosRemotos());
    } catch {
      setError("No se pudo cargar el catálogo fenológico.");
    }
  }

  if (cargando) {
    return <p className="text-[13px] text-stone-500">Cargando catálogo…</p>;
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-800">
            Catálogo y Kc
          </h2>
          <p className="mt-1 text-[12px] text-stone-500">
            Carga el catálogo fenológico y valida el Kc (por cultivo y estado).
            El Kc no validado no se aplica.
          </p>
        </div>
        <button
          type="button"
          onClick={cargarCatalogo}
          className="shrink-0 rounded-xl border border-brand-700 px-3 py-2 text-[13px] font-medium text-brand-800"
        >
          Cargar catálogo
        </button>
      </div>

      {mensaje ? (
        <p className="mt-3 text-[13px] font-medium text-emerald-700">{mensaje}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-3">
        {cultivos.map((cultivo) => {
          const borrador = borradores[cultivo.id];
          const listaEstados = estados[cultivo.id] ?? [];
          return (
            <li
              key={cultivo.id}
              className="rounded-xl border border-stone-200 p-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-32 text-[13px] font-semibold text-stone-700">
                  {cultivo.nameEs}
                  <span className="ml-1 text-[11px] font-normal text-stone-400">
                    {cultivo.slug}
                  </span>
                </span>
                <label className="flex items-center gap-1 text-[12px] text-stone-500">
                  Kc
                  <input
                    className={claseInput}
                    value={borrador?.kc ?? ""}
                    onChange={(e) =>
                      setBorradores((previo) => ({
                        ...previo,
                        [cultivo.id]: {
                          kc: e.target.value,
                          kcValidated: previo[cultivo.id]?.kcValidated ?? false,
                        },
                      }))
                    }
                  />
                </label>
                <label className="flex items-center gap-1 text-[12px] text-stone-500">
                  <input
                    type="checkbox"
                    checked={borrador?.kcValidated ?? false}
                    onChange={(e) =>
                      setBorradores((previo) => ({
                        ...previo,
                        [cultivo.id]: {
                          kc: previo[cultivo.id]?.kc ?? "",
                          kcValidated: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 accent-brand-700"
                  />
                  Validado
                </label>
                <button
                  type="button"
                  onClick={() =>
                    guardarKc(`/api/plataforma/cultivos/${cultivo.id}`, borrador)
                  }
                  className="rounded-lg bg-brand-800 px-3 py-1.5 text-[12px] font-semibold text-white"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => alternarEstados(cultivo.id)}
                  className="text-[12px] font-medium text-brand-800"
                >
                  {abiertos[cultivo.id] ? "Ocultar estados" : "Ver estados"}
                </button>
              </div>

              {abiertos[cultivo.id] ? (
                <ul className="mt-3 flex flex-col gap-2 border-t border-stone-100 pt-3">
                  {listaEstados.map((estado) => {
                    const borradorEstado = borradores[estado.id];
                    return (
                      <li
                        key={estado.id}
                        className="flex flex-wrap items-center gap-3"
                      >
                        <span className="min-w-40 text-[12px] text-stone-600">
                          {estado.nameEs}
                          <span className="ml-1 text-[10px] text-stone-400">
                            {estado.slug}
                          </span>
                        </span>
                        <label className="flex items-center gap-1 text-[12px] text-stone-500">
                          Kc
                          <input
                            className={claseInput}
                            value={borradorEstado?.kc ?? ""}
                            onChange={(e) =>
                              setBorradores((previo) => ({
                                ...previo,
                                [estado.id]: {
                                  kc: e.target.value,
                                  kcValidated:
                                    previo[estado.id]?.kcValidated ?? false,
                                },
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[12px] text-stone-500">
                          <input
                            type="checkbox"
                            checked={borradorEstado?.kcValidated ?? false}
                            onChange={(e) =>
                              setBorradores((previo) => ({
                                ...previo,
                                [estado.id]: {
                                  kc: previo[estado.id]?.kc ?? "",
                                  kcValidated: e.target.checked,
                                },
                              }))
                            }
                            className="h-4 w-4 accent-brand-700"
                          />
                          Validado
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            guardarKc(
                              `/api/plataforma/estados-fenologicos/${estado.id}`,
                              borradorEstado,
                            )
                          }
                          className="rounded-lg bg-stone-700 px-3 py-1.5 text-[12px] font-semibold text-white"
                        >
                          Guardar
                        </button>
                      </li>
                    );
                  })}
                  {listaEstados.length === 0 ? (
                    <li className="text-[12px] text-stone-400">
                      Sin estados cargados. Pulsa «Cargar catálogo».
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
