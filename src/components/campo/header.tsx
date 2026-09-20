export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b-2 border-stone-900/10 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold tracking-tight text-stone-900">
            TecRural Campo
          </p>
          <p className="truncate text-sm font-medium text-stone-700">
            Alertas y datos útiles para tu explotación.
          </p>
        </div>
        <a
          href="/#contacto"
          className="shrink-0 rounded-full border-2 border-brand-800 bg-brand-800 px-3 py-1.5 text-sm font-bold text-white hover:bg-brand-900"
        >
          Contacto
        </a>
      </div>
    </header>
  );
}