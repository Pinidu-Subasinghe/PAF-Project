const features = [
  {
    title: 'Hero-first structure',
    description: 'Put the main message up front with a strong heading, supporting text, and two clear actions.',
  },
  {
    title: 'Section-based design',
    description: 'Break the page into focused blocks so each area has one job and stays easy to maintain.',
  },
  {
    title: 'Polished visuals',
    description: 'Use soft gradients, borders, and spacing to make the page feel intentional without clutter.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="rounded-[2rem] border border-slate-200 bg-white px-6 py-12 shadow-[0_20px_40px_rgba(15,23,42,0.06)] sm:px-10">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Features</p>
        <h2 className="mt-3 font-serif text-3xl text-slate-900 sm:text-4xl">Each section stays focused and reusable.</h2>
        <p className="mt-4 text-slate-600">
          The page is split into components so you can swap, reorder, or extend sections without rewriting the whole
          layout.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {features.map((feature, index) => (
          <article
            key={feature.title}
            className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
              0{index + 1}
            </div>
            <h3 className="mt-4 font-serif text-2xl text-slate-900">{feature.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}