export default function DashboardShell({ title, subtitle, items, activeItemId, onSelect, children }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
              <h1 className="mt-2 text-lg font-semibold text-slate-900">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>

            <nav className="space-y-2">
              {items.map((item) => {
                const isActive = item.id === activeItemId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    {item.description && (
                      <span className={`text-xs ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                        {item.description}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {children}
          </section>
        </div>
      </div>
    </main>
  )
}
