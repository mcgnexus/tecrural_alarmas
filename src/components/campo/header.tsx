export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-brand-900">
            TecRural Campo
          </p>
          <p className="truncate text-xs text-stone-500">
            Riesgo agroclimático sencillo
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
          MVP
        </span>
      </div>
    </header>
  );
}