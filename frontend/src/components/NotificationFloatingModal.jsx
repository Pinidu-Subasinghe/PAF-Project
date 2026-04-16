function readNotificationActionLabel(notification) {
  const target = notification?.actionTarget?.trim()
  if (target === 'change-password') {
    return 'Open password settings'
  }

  return 'Open notification'
}

export default function NotificationFloatingModal({
  isOpen,
  notifications,
  isLoading,
  errorMessage,
  unreadBadgeLabel,
  onNavigate,
}) {
  if (!isOpen) {
    return null
  }

  const hasNotifications = Array.isArray(notifications) && notifications.length > 0

  return (
    <div className="fixed right-2 top-16 z-30 w-[min(22rem,calc(100vw-1rem))] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 md:absolute md:right-0 md:top-12 md:w-80 md:max-h-[70vh]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
        {hasNotifications && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {unreadBadgeLabel}
          </span>
        )}
      </div>

      {isLoading && (
        <p className="mt-3 text-sm text-slate-600">Loading notifications...</p>
      )}

      {!isLoading && errorMessage && (
        <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
      )}

      {!isLoading && !errorMessage && !hasNotifications && (
        <p className="mt-3 text-sm text-slate-600">No new notifications.</p>
      )}

      {!isLoading && hasNotifications && (
        <div className="mt-3 max-h-[calc(100dvh-12rem)] space-y-2 overflow-y-auto pr-1 md:max-h-[60vh]">
          {notifications.map((notification) => (
            <article key={notification.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
              <p className="mt-1 text-xs text-slate-600">{notification.message}</p>
              <button
                type="button"
                className="mt-3 inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                onClick={() => onNavigate(notification)}
              >
                {readNotificationActionLabel(notification)}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
