export default function HeroSection() {
	const highlights = [
		'Unified operations for rooms, labs, equipment, and incidents in one hub.',
		'Role-based workflow for USER, ADMIN, and optional TECHNICIAN access paths.',
		'Strong auditability with status transitions, comments, and reason tracking.',
	]

  return (
    <section className="fade-up py-14 lg:py-18">
      <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex h-full flex-col justify-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            UniPilot
          </p>
          <h1 className="mt-5 max-w-4xl font-serif text-4xl leading-tight text-slate-900 sm:text-5xl lg:text-[3.75rem]">
            Smart Campus Operations Hub
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
            A single web platform to manage campus facility bookings, equipment usage, and incident maintenance with
            clear workflows, role-based access, and traceable operations.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/auth#register"
              className="rounded-full bg-teal-700 px-7 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-teal-600"
            >
              Start with Sign up
            </a>
            <a
              href="#modules"
              className="rounded-full border border-slate-400 px-7 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-700 hover:text-slate-900"
            >
              Explore Modules
            </a>
          </div>
        </div>

        <div className="fade-up fade-up-delay-1 flex h-full flex-col justify-center border-l border-slate-300 pl-6 sm:pl-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">What This Platform Delivers</p>
          <ul className="mt-6 space-y-6">
            {highlights.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span className="text-sm leading-7 text-slate-700 sm:text-base">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}