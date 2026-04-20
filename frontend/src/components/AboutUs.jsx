import {
  Users,
  Layers,
  ShieldCheck,
  Zap,
  UserCircle,
  UserRound,
} from "lucide-react";

export default function AboutUs() {
  return (
    <div className="bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          About Smart Campus Hub
        </h1>
        <p className="mt-4 mx-auto max-w-2xl text-slate-500">
          A unified platform designed to simplify campus operations — from facility bookings to maintenance workflows — all in one place.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:bg-blue-50 hover:shadow-md cursor-pointer">
            <Users className="h-6 w-6 text-blue-600" />
            <h3 className="mt-4 font-semibold">User-Centered</h3>
            <p className="mt-2 text-sm text-slate-500">
              Built to serve students, staff, and administrators with intuitive workflows.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:bg-blue-50 hover:shadow-md cursor-pointer">
            <Layers className="h-6 w-6 text-green-600" />
            <h3 className="mt-4 font-semibold">All-in-One Platform</h3>
            <p className="mt-2 text-sm text-slate-500">
              Manage facilities, bookings, and incidents without switching systems.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:bg-blue-50 hover:shadow-md cursor-pointer">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            <h3 className="mt-4 font-semibold">Secure & Reliable</h3>
            <p className="mt-2 text-sm text-slate-500">
              Role-based access and secure workflows ensure data integrity and control.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:bg-blue-50 hover:shadow-md cursor-pointer">
            <Zap className="h-6 w-6 text-yellow-600" />
            <h3 className="mt-4 font-semibold">Efficient Workflows</h3>
            <p className="mt-2 text-sm text-slate-500">
              Streamlined processes reduce delays and improve campus productivity.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-semibold">Our Mission</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Our mission is to modernize campus operations by providing a seamless, efficient, and user-friendly platform that connects people, resources, and services in a smarter way.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">Our Team</h2>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[
            {
              name: 'Pinidu Subasinghe',
              role: 'Frontend Developer',
              Icon: UserCircle,
            },
            {
              name: 'Navod Wijesooriya',
              role: 'Frontend Developer',
              Icon: UserCircle,
            },
            {
              name: 'Bhagya Navodyani',
              role: 'Backend Developer',
              Icon: UserRound,
            },
            {
              name: 'Kavishka Malshan',
              role: 'Backend Developer',
              Icon: UserCircle,
            },
          ].map((member, index) => (
            <div
              key={index}
              className="rounded-xl border border-sky-200 bg-blue-50 p-6 text-center shadow-sm transition duration-200 hover:bg-sky-100 hover:shadow-md cursor-pointer"
            >
              <member.Icon className="mx-auto h-16 w-16 text-slate-400" />
              <h3 className="mt-4 font-medium">{member.name}</h3>
              <p className="text-sm text-slate-500">{member.role}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
