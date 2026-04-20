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
  total,
}) {
  if (!isOpen) {
    return null
  }

  const hasNotifications = Array.isArray(notifications) && notifications.length > 0

  return (
    <div className="fixed right-2 top-16 z-30 w-[min(22rem,calc(100vw-1rem))] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-xl shadow-gray-900/10 md:absolute md:right-0 md:top-12 md:w-80 md:max-h-[70vh]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        {hasNotifications && (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
            {unreadBadgeLabel}
          </span>
        )}
      </div>

      {isLoading && (
        <p className="mt-3 text-sm text-gray-600">Loading notifications...</p>
      )}

      {!isLoading && errorMessage && (
        <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
      )}

      {!isLoading && !errorMessage && !hasNotifications && (
        <p className="mt-3 text-sm text-gray-600">No new notifications.</p>
      )}

      {!isLoading && hasNotifications && (
        <div className="mt-3 max-h-[calc(100dvh-12rem)] space-y-2 overflow-y-auto pr-1 md:max-h-[60vh]">
          {notifications.map((notification) => {
            const isRead = Boolean(notification.read)

            const baseArticle =
              'rounded-xl border p-3 cursor-pointer focus:outline-none focus:ring-2'

            // Read → green
            const readArticle =
              'bg-green-50 border-green-200 hover:bg-green-100 focus:ring-green-200'

            // Unread → blue
            const unreadArticle =
              'bg-blue-100 border-blue-300 hover:bg-blue-100 focus:ring-blue-200'

            const articleClass = `${baseArticle} ${isRead ? readArticle : unreadArticle}`

            const titleClass = `text-sm font-semibold ${
              isRead ? 'text-green-900' : 'text-blue-900'
            }`

            const messageClass = `mt-1 text-xs ${
              isRead ? 'text-green-700' : 'text-blue-700'
            }`

            return (
              <article
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={() => onNavigate(notification)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' ||
                    e.key === ' ' ||
                    e.key === 'Spacebar' ||
                    e.key === 'Space'
                  ) {
                    e.preventDefault()
                    onNavigate(notification)
                  }
                }}
                className={articleClass}
              >
                <p className={titleClass}>{notification.title}</p>
                <p className={messageClass}>{notification.message}</p>
              </article>
            )
          })}

          {typeof total === 'number' && total > notifications.length && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                className="text-sm font-semibold text-gray-700 hover:underline"
                onClick={() =>
                  window.dispatchEvent(new Event('unipilot-notification-view-more'))
                }
              >
                View more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}