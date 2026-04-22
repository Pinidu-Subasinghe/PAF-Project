import BookingForm from '../components/booking/BookingForm'

export default function BookingCreatePage() {
  let match = window.location.pathname.match(/^\/bookings\/create\/(\d+)$/)
  if (!match) {
    match = window.location.pathname.match(/^\/resources\/(\d+)\/book-now$/)
  }
  const resourceId = match ? Number(match[1]) : null

  if (!resourceId) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
          Invalid resource ID. Please return to resources and try again.
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1faf9_0%,#f8fafc_40%,#ffffff_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <BookingForm resourceId={resourceId} />
    </main>
  )
}
