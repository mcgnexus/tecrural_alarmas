"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface ItemNav {
  href: string;
  etiqueta: string;
  icono: string;
}

const items: ItemNav[] = [
  { href: "/", etiqueta: "Inicio", icono: "home" },
  { href: "/parcelas", etiqueta: "Parcelas", icono: "pin" },
  { href: "/alertas", etiqueta: "Alertas", icono: "campana" },
  { href: "/servicios", etiqueta: "Servicios", icono: "maletin" },
  { href: "/configuracion", etiqueta: "Ajustes", icono: "ajustes" },
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
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true" {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case "pin":
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true" {...common}>
          <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "campana":
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true" {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 2 8 2 8H4s2-1 2-8" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      );
    case "maletin":
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true" {...common}>
          <rect x="4" y="8" width="16" height="11" rx="2" />
          <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M2 13h20" />
        </svg>
      );
    case "ajustes":
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true" {...common}>
          <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
          <path d="M2 14h4M10 8h4M18 16h4" />
        </svg>
      );
    default:
      return null;
  }
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t-2 border-stone-900/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-5 gap-1 px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        {items.map((item) => {
          const activo =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activo ? "page" : undefined}
              aria-label={item.etiqueta}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[15px] font-semibold leading-none ${
                activo
                  ? "bg-brand-800 text-white shadow-sm"
                  : "text-stone-700 hover:bg-stone-100 active:bg-stone-200"
              }`}
            >
              <Icono nombre={item.icono} />
              <span className="text-center leading-none">{item.etiqueta}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}