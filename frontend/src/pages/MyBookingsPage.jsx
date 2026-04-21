import BookingList from '../components/booking/BookingList'

export default function MyBookingsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1faf9_0%,#f8fafc_40%,#ffffff_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 rounded-[2rem] border border-teal-100 bg-white/90 p-7 shadow-sm shadow-teal-900/5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Booking Management</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">My Bookings</h1>
          <p className="mt-2 text-sm text-slate-600">Track your booking requests and current statuses.</p>
        </div>

        <BookingList scope="my" />
      </div>
    </main>
  )
}
