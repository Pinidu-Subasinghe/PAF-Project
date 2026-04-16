const qualityTracks = [
  {
    title: 'Validation & Error Handling',
    copy: 'Use robust request validation, meaningful HTTP status codes, and consistent API error bodies.',
  },
  {
    title: 'Testing & Quality Evidence',
    copy: 'Cover core business logic with unit/integration tests and maintain a verifiable Postman collection.',
  },
  {
    title: 'Version Control & CI',
    copy: 'Keep an active Git history and run build plus test in GitHub Actions for every critical branch.',
  },
]

export default function WorkflowSection() {
  const bookingFlow = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']
  const ticketFlow = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']

  return (
    <section id="workflow" className="fade-up fade-up-delay-3 scroll-mt-28">
      <div className="grid items-center gap-12 border-b border-slate-300/70 pb-12 lg:grid-cols-2">
        <article className="flex h-full flex-col justify-center border-l-4 border-teal-600 pl-6 sm:pl-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Booking Workflow</p>
          <h3 className="mt-3 font-serif text-3xl text-slate-900">From request to approval with conflict protection.</h3>
          <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base">
            Users request by date/time/purpose while admins review, decide, and provide reasons for rejections.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {bookingFlow.map((step, index) => (
              <span
                key={step}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold tracking-[0.1em] text-slate-700"
              >
                {index === 0 ? step : `→ ${step}`}
              </span>
            ))}
          </div>
        </article>

        <article className="flex h-full flex-col justify-center border-l-4 border-amber-500 pl-6 sm:pl-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Incident Workflow</p>
          <h3 className="mt-3 font-serif text-3xl text-slate-900">Track maintenance tickets through full resolution.</h3>
          <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base">
            Tickets support up to three evidence images, assignee updates, technician notes, and collaborative comments.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {ticketFlow.map((step, index) => (
              <span
                key={step}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold tracking-[0.1em] text-slate-700"
              >
                {index === 0 ? step : `→ ${step}`}
              </span>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-10 grid items-stretch gap-8 md:grid-cols-3">
        {qualityTracks.map((track) => (
          <article key={track.title} className="flex h-full flex-col justify-center border-t border-slate-300 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{track.title}</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{track.copy}</p>
          </article>
        ))}
      </div>
    </section>
  )
}