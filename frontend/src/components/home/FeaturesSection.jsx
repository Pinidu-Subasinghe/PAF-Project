const modules = [
  {
    code: 'A',
    title: 'Facilities & Assets Catalogue',
    description: 'Manage lecture halls, labs, meeting rooms, and equipment with searchable metadata.',
    highlights: ['Type, capacity, location', 'Availability windows', 'ACTIVE / OUT_OF_SERVICE statuses'],
  },
  {
    code: 'B',
    title: 'Booking Management',
    description: 'Capture booking requests and drive approvals with conflict detection and reasoned decisions.',
    highlights: ['PENDING to APPROVED/REJECTED', 'Conflict prevention', 'Admin review with reason'],
  },
  {
    code: 'C',
    title: 'Maintenance & Incident Ticketing',
    description: 'Handle incidents by priority, attachments, assignments, and technician resolution notes.',
    highlights: ['Up to 3 evidence images', 'OPEN to CLOSED workflow', 'Comment ownership rules'],
  },
  {
    code: 'D',
    title: 'Notifications',
    description: 'Deliver in-app updates for booking decisions, ticket state changes, and comments.',
    highlights: ['Approval/rejection alerts', 'Ticket updates', 'Notification panel in web UI'],
  },
  {
    code: 'E',
    title: 'Authentication & Authorization',
    description: 'Secure access through OAuth 2.0 login, role checks, and protected routes/endpoints.',
    highlights: ['Google sign-in ready', 'USER and ADMIN minimum', 'RBAC for API and front-end'],
  },
]

export default function FeaturesSection() {
  return (
    <section id="modules" className="fade-up fade-up-delay-2 scroll-mt-28">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Core Feature Modules</p>
        <h2 className="mt-3 font-serif text-3xl text-slate-900 sm:text-4xl lg:text-5xl">
          Built for real campus operations, not isolated tools.
        </h2>
        <p className="mt-5 text-base leading-8 text-slate-700">
          Each module maps directly to your assignment requirements and can be implemented as clean REST resources
          with role-aware front-end experiences.
        </p>
      </div>

      <ol className="mt-10 divide-y divide-slate-300 border-y border-slate-300">
        {modules.map((module) => (
          <li key={module.code} className="grid items-center gap-4 py-7 md:grid-cols-[4.5rem_1fr] md:gap-8">
            <p className="font-serif text-4xl leading-none text-amber-600">{module.code}</p>
            <div className="flex h-full flex-col justify-center">
              <h3 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{module.title}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">{module.description}</p>
              <ul className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                {module.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}