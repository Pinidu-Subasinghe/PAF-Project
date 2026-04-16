export default function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 px-6 py-14 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:px-10 sm:py-16 lg:px-14 lg:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(250,204,21,0.34)_0%,rgba(251,191,36,0.18)_42%,transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(56,189,248,0.26)_0%,rgba(29,78,216,0.16)_44%,transparent_72%)]"
      />

      <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="inline-flex rounded-full border border-amber-500/20 bg-amber-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Sample Homepage
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Build a clean landing page with clear sections and strong visual hierarchy.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            This homepage demonstrates a section-based layout with a hero, stats, features, workflow, and a final
            call to action. It is intentionally simple, readable, and easy to extend.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#features"
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Explore Sections
            </a>
            <a
              href="#workflow"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              View Flow
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Overview</p>
                <p className="mt-1 text-lg font-semibold">Homepage Snapshot</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                Ready
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ['5', 'Sections'],
                ['100%', 'Responsive'],
                ['3', 'Feature Cards'],
                ['1', 'Clear CTA'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-sm text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}