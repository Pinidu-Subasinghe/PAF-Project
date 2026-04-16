const steps = [
  {
    title: '1. Introduce the product',
    description: 'Lead with the core value and a visual panel that quickly explains what the page is about.',
  },
  {
    title: '2. Show proof points',
    description: 'Use metrics and feature cards to give the visitor a fast scan-friendly summary.',
  },
  {
    title: '3. End with direction',
    description: 'Close with a simple CTA that points to the next step without adding friction.',
  },
]

export default function WorkflowSection() {
  return (
    <section id="workflow" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <article className="rounded-[2rem] border border-slate-200 bg-slate-900 px-6 py-10 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)] sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">Workflow</p>
        <h2 className="mt-3 font-serif text-3xl text-white sm:text-4xl">A simple flow makes the page easy to read.</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Section-based components help you keep the layout organized, especially when you want to add more content
          later.
        </p>
      </article>

      <div className="grid gap-4">
        {steps.map((step) => (
          <article key={step.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
            <h3 className="font-serif text-2xl text-slate-900">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}