export default function CtaSection() {
  const deliverables = [
    'Functional requirements for REST API and client web application',
    'System architecture diagram plus REST and front-end breakdowns',
    'Secure implementation with OAuth2, RBAC, validation, and safe file handling',
    'Evidence-driven testing and CI pipeline with build and test automation',
  ]

  return (
    <section id="deliverables" className="fade-up fade-up-delay-4 scroll-mt-28 border-t border-slate-300/70 pt-10 lg:pt-14">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex h-full flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Build Roadmap</p>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Ready to build the assignment with a scalable and maintainable architecture.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">
            Use this homepage as the north star for implementation priorities, individual module ownership, and
            delivery checkpoints across the semester.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/auth#register"
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-slate-700"
            >
              Create Account
            </a>
            <a
              href="/auth#login"
              className="rounded-full border border-slate-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-700 hover:text-slate-900"
            >
              Login
            </a>
          </div>
        </div>

        <ul className="flex h-full flex-col justify-center space-y-4 text-sm leading-7 text-slate-700 sm:text-base">
          {deliverables.map((item) => (
            <li key={item} className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}