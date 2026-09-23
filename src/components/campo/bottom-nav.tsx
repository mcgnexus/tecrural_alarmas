"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ItemNav {
  href: string;
  etiqueta: string;
  icono: string;
}

const items: ItemNav[] = [
  { href: "/", etiqueta: "Inicio", icono: "home" },
  { href: "/#prevision", etiqueta: "Tiempo", icono: "tiempo" },
  { href: "/#captacion", etiqueta: "Avisos", icono: "campana" },
  { href: "/#como-funciona", etiqueta: "¿Cómo funciona?", icono: "ayuda" },
  { href: "/cuenta", etiqueta: "Acceso", icono: "acceso" },
];

function Icono({ nombre }: { nombre: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  switch (nombre) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case "pin":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...common}>
          <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "campana":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 2 8 2 8H4s2-1 2-8" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      );
    case "maletin":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...common}>
          <rect x="4" y="8" width="16" height="11" rx="2" />
          <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M2 13h20" />
        </svg>
      );
    case "tiempo":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...common}>
          <circle cx="12" cy="12" r="5" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.42 1.42M17.66 17.66l1.42 1.42M4.93 19.07l1.42-1.42M17.66 6.34l1.42-1.42" />
        </svg>
      );
    case "ayuda":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-1.5 3" />
          <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "acceso":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Desplaza a la sección del enlace cuando ya estamos en su página.
 * Evita que `next/link` ignore el hash (misma ruta) y no haga scroll.
 */
function desplazarEnPagina(
  e: MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string
) {
  const [ruta, hash] = href.split("#");
  const rutaBase = ruta || "/";
  if (rutaBase !== pathname) return;

  const destino =
    (hash ? document.getElementById(hash) : null) ??
    (hash === "prevision" ? document.getElementById("zona") : null);

  if (destino) {
    e.preventDefault();
    destino.scrollIntoView({ behavior: "smooth", block: "start" });
    if (hash) window.history.replaceState(null, "", `#${hash}`);
    return;
  }

  if (href === "/") {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.history.replaceState(null, "", "/");
  }
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t-2 border-stone-900/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95 md:hidden">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-5 gap-0.5 px-2 pb-[env(safe-area-inset-bottom)] pt-0.5">
        {items.map((item) => {
          const base = item.href.split("#")[0] || "/";
          const activo =
            base === "/"
              ? pathname === "/"
              : pathname.startsWith(base);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activo ? "page" : undefined}
              aria-label={item.etiqueta}
              onClick={(e) => desplazarEnPagina(e, item.href, pathname)}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[13px] font-semibold leading-none sm:text-[15px] ${
                activo
                  ? "bg-brand-800 text-white shadow-sm"
                  : "text-stone-700 hover:bg-stone-100 active:bg-stone-200"
              }`}
            >
              <Icono nombre={item.icono} />
              <span className="w-full truncate text-center leading-none">{item.etiqueta}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Navegación superior para escritorio; en móvil se usa `BottomNav`. */
export function NavEscritorio() {
  const pathname = usePathname();
  const [seleccion, setSeleccion] = useState<{ path: string; href: string } | null>(
    null
  );

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const activoRuta =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const activo =
          seleccion && seleccion.path === pathname
            ? seleccion.href === item.href
            : activoRuta;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            onClick={(e) => {
              setSeleccion({ path: pathname, href: item.href });
              desplazarEnPagina(e, item.href, pathname);
            }}
            className={`inline-flex min-h-[44px] items-center rounded-xl px-2 text-[14px] font-semibold transition-colors lg:px-3 lg:text-[15px] ${
              activo
                ? "bg-brand-800 text-white"
                : "text-stone-700 hover:bg-stone-100 active:bg-brand-800 active:text-white"
            }`}
          >
            {item.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}