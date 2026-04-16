export default function DashboardShell({ title, subtitle, items, activeItemId, onSelect, children }) {
  return (
    <main className="h-full bg-slate-50 overflow-hidden">
      <div className="flex h-full">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 shadow-sm lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-16 lg:h-[calc(100dvh-4rem)]">
          <div className="mb-6">
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
                  className={`flex w-full flex-col gap-1 rounded-xl px-3 py-2 text-left transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
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

        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:pl-72 lg:pr-10">
          <div className="mb-6 shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            <nav className="mt-4 grid gap-2 sm:grid-cols-2">
              {items.map((item) => {
                const isActive = item.id === activeItemId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex w-full flex-col gap-1 rounded-xl px-3 py-2 text-left transition ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
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
          </div>

          <section className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            {children}
          </section>
        </div>
      </div>
    </main>
  )
}
