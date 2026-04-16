export default function CtaSection() {
  return (
    <section className="rounded-[2rem] border border-amber-200 bg-gradient-to-r from-amber-100 via-white to-sky-100 px-6 py-12 sm:px-10">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">Call to action</p>
        <h2 className="mt-3 font-serif text-3xl text-slate-900 sm:text-4xl">Ready to connect this homepage to your app.</h2>
        <p className="mt-4 text-slate-600">
          This is a sample homepage, so it gives you a structured starting point that you can later connect to routes,
          auth pages, or backend data.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="#top"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Back to Top
          </a>
          <a
            href="#features"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Revisit Sections
          </a>
        </div>
      </div>
    </section>
  )
}