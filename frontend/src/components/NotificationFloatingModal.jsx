import { useEffect, useMemo, useState } from 'react'
import { HiOutlineCog6Tooth } from 'react-icons/hi2'

export default function NotificationFloatingModal({
  isOpen,
  notifications,
  isLoading,
  errorMessage,
  unreadBadgeLabel,
  onNavigate,
  total,
  preferences,
  isPreferencesLoading,
  isPreferencesSaving,
  preferencesErrorMessage,
  onOpenPreferences,
  onSavePreferences,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [draftPreferences, setDraftPreferences] = useState({
    profileNotificationsEnabled: true,
    bookingNotificationsEnabled: true,
    ticketNotificationsEnabled: true,
  })

  useEffect(() => {
    if (preferences) {
      setDraftPreferences({
        profileNotificationsEnabled: Boolean(preferences.profileNotificationsEnabled),
        bookingNotificationsEnabled: Boolean(preferences.bookingNotificationsEnabled),
        ticketNotificationsEnabled: Boolean(preferences.ticketNotificationsEnabled),
      })
    }
  }, [preferences])

  const hasNotifications = Array.isArray(notifications) && notifications.length > 0
  const hasPreferenceChanges = useMemo(() => {
    if (!preferences) {
      return false
    }

    return (
      Boolean(preferences.profileNotificationsEnabled) !== draftPreferences.profileNotificationsEnabled
      || Boolean(preferences.bookingNotificationsEnabled) !== draftPreferences.bookingNotificationsEnabled
      || Boolean(preferences.ticketNotificationsEnabled) !== draftPreferences.ticketNotificationsEnabled
    )
  }, [preferences, draftPreferences])

  const notificationCategories = [
    {
      key: 'profileNotificationsEnabled',
      title: 'Profile notifications',
      description: 'Account-related updates such as password setup and profile security reminders.',
    },
    {
      key: 'bookingNotificationsEnabled',
      title: 'Booking notifications',
      description: 'Booking requests, approval/rejection decisions, and cancellation updates.',
    },
    {
      key: 'ticketNotificationsEnabled',
      title: 'Ticket and incident notifications',
      description: 'Ticket creation, assignment, resolution, and rejection updates.',
    },
  ]

  const handleToggleSettings = () => {
    const nextOpen = !isSettingsOpen
    setIsSettingsOpen(nextOpen)
    if (nextOpen) {
      onOpenPreferences?.()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed right-2 top-16 z-30 w-[min(22rem,calc(100vw-1rem))] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-xl shadow-gray-900/10 md:absolute md:right-0 md:top-12 md:w-80 md:max-h-[70vh]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center gap-2">
          {hasNotifications && (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
              {unreadBadgeLabel}
            </span>
          )}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
            aria-label="Notification settings"
            aria-expanded={isSettingsOpen}
            onClick={handleToggleSettings}
          >
            <HiOutlineCog6Tooth className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <h4 className="text-sm font-semibold text-gray-900">Notification settings</h4>
          <p className="mt-1 text-xs text-gray-600">Choose which categories you want to receive.</p>

          {isPreferencesLoading && (
            <p className="mt-2 text-xs text-gray-600">Loading settings...</p>
          )}

          {!isPreferencesLoading && (
            <div className="mt-3 space-y-3">
              {notificationCategories.map((category) => (
                <div key={category.key} className="rounded-lg border border-gray-200 bg-white p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{category.title}</p>
                      <p className="mt-1 text-[11px] leading-5 text-gray-600">{category.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draftPreferences[category.key]}
                      onClick={() => {
                        setDraftPreferences((current) => ({
                          ...current,
                          [category.key]: !current[category.key],
                        }))
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                        draftPreferences[category.key] ? 'bg-slate-900' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          draftPreferences[category.key] ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {preferencesErrorMessage && (
            <p className="mt-2 text-xs text-red-600">{preferencesErrorMessage}</p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-500"
              onClick={() => setIsSettingsOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => onSavePreferences?.(draftPreferences)}
              disabled={!hasPreferenceChanges || isPreferencesSaving || isPreferencesLoading}
            >
              {isPreferencesSaving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      )}

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