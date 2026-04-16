const stats = [
  { value: '24/7', label: 'Availability' },
  { value: '6+', label: 'Reusable parts' },
  { value: '99%', label: 'Clarity score' },
  { value: '0', label: 'Routing setup needed' },
]

export default function StatsSection() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-[0_16px_32px_rgba(15,23,42,0.06)]"
        >
          <p className="font-serif text-3xl text-slate-900">{stat.value}</p>
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
        </article>
      ))}
    </section>
  )
}