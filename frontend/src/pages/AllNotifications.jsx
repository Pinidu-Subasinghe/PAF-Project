import { useCallback, useEffect, useMemo, useState } from 'react'
import { HiOutlineCheck } from 'react-icons/hi2'
import { getAllMyNotifications, markNotificationAsRead } from '../api/api'
import { authSessionChangeEvent, readAuthSession } from '../utils/authSession'

function navigateTo(pathname) {
	window.history.pushState(null, '', pathname)
	window.dispatchEvent(new PopStateEvent('popstate'))
}

function getDashboardHomePath(role) {
	if (role === 'ADMIN') {
		return '/admin-dashboard'
	}

	if (role === 'TECHNICIAN') {
		return '/technician-dashboard'
	}

	return '/user-dashboard'
}

function resolveNotificationDestination(notification, authSession) {
	const target = notification?.actionTarget?.trim()
	const role = authSession?.role

	if (target === 'change-password') {
		return role === 'ADMIN'
			? '/admin-dashboard?tab=change-password'
			: getDashboardHomePath(role)
	}

	if (target === 'manage-bookings') {
		return '/admin-dashboard?tab=manage-bookings'
	}

	if (target === 'my-bookings') {
		return '/user-dashboard?tab=my-bookings'
	}

	if (target === 'manage-resources') {
		return '/admin-dashboard?tab=manage-resources'
	}

	if (target === 'tickets') {
		return '/admin-dashboard?tab=tickets'
	}

	if (target === 'assigned') {
		return '/technician-dashboard?tab=assigned'
	}

	if (target === 'my-tickets') {
		return '/user-dashboard?tab=my-tickets'
	}

	return getDashboardHomePath(role)
}

function formatDateTime(value) {
	if (!value) {
		return ''
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return ''
	}

	return parsed.toLocaleString()
}

export default function AllNotifications() {
	const [session, setSession] = useState(() => readAuthSession())
	const [notifications, setNotifications] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')

	useEffect(() => {
		const syncSession = () => setSession(readAuthSession())
		window.addEventListener('storage', syncSession)
		window.addEventListener(authSessionChangeEvent, syncSession)

		return () => {
			window.removeEventListener('storage', syncSession)
			window.removeEventListener(authSessionChangeEvent, syncSession)
		}
	}, [])

	const loadAllNotifications = useCallback(async () => {
		if (!session?.token) {
			setNotifications([])
			setErrorMessage('')
			return
		}

		setIsLoading(true)
		setErrorMessage('')
		try {
			const response = await getAllMyNotifications()
			setNotifications(Array.isArray(response) ? response : [])
		} catch (error) {
			setNotifications([])
			setErrorMessage(error instanceof Error ? error.message : 'Unable to load notifications right now.')
		} finally {
			setIsLoading(false)
		}
	}, [session?.token])

	useEffect(() => {
		loadAllNotifications()
	}, [loadAllNotifications])

	const unreadCount = useMemo(
		() => notifications.filter((notification) => !notification.read).length,
		[notifications],
	)

	const handleMarkAllAsRead = async () => {
		if (isLoading || unreadCount === 0) {
			return
		}

		const unreadNotifications = notifications.filter((notification) => !notification.read && notification.id)
		if (unreadNotifications.length === 0) {
			return
		}

		setErrorMessage('')
		const results = await Promise.allSettled(
			unreadNotifications.map((notification) => markNotificationAsRead(notification.id)),
		)

		const successfulIds = new Set(
			results
				.map((result, index) => (result.status === 'fulfilled' ? unreadNotifications[index].id : null))
				.filter(Boolean),
		)

		setNotifications((current) => (
			current.map((notification) => (
				successfulIds.has(notification.id)
					? { ...notification, read: true, readAt: new Date().toISOString() }
					: notification
			))
		))

		const hasFailures = results.some((result) => result.status === 'rejected')
		if (hasFailures) {
			setErrorMessage('Some notifications could not be marked as read. Please try again.')
		}
	}

	const handleOpenNotification = async (notification) => {
		const destination = resolveNotificationDestination(notification, session)

		if (notification?.id && !notification.read) {
			try {
				await markNotificationAsRead(notification.id)
				setNotifications((current) => (
					current.map((item) => (
						item.id === notification.id ? { ...item, read: true, readAt: new Date().toISOString() } : item
					))
				))
			} catch {
				// Navigation should still happen even if read-status update fails.
			}
		}

		navigateTo(destination)
	}

	if (!session) {
		return (
			<main className="min-h-screen bg-slate-50">
				<div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
					<h1 className="text-2xl font-semibold text-slate-900">Sign in required</h1>
					<p className="mt-2 text-sm text-slate-500">Please sign in to view all notifications.</p>
					<a
						href="/login"
						className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
					>
						Go to login
					</a>
				</div>
			</main>
		)
	}

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-4xl">
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h1 className="text-2xl font-semibold text-slate-900">All notifications</h1>
							<p className="mt-1 text-sm text-slate-500">You have {unreadCount} unread notification(s).</p>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
								onClick={handleMarkAllAsRead}
								disabled={isLoading || unreadCount === 0}
							>
								<HiOutlineCheck className="h-4 w-4" />
								Mark all as read
							</button>
							<button
								type="button"
								className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
								onClick={loadAllNotifications}
							>
								Refresh
							</button>
						</div>
					</div>

					{isLoading && <p className="mt-4 text-sm text-slate-600">Loading notifications...</p>}

					{!isLoading && errorMessage && (
						<p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{errorMessage}
						</p>
					)}

					{!isLoading && !errorMessage && notifications.length === 0 && (
						<p className="mt-4 text-sm text-slate-600">No notifications found.</p>
					)}

					{!isLoading && notifications.length > 0 && (
						<div className="mt-4 space-y-3">
							{notifications.map((notification) => {
								const isRead = Boolean(notification.read)

								return (
									<article
										key={notification.id}
										role="button"
										tabIndex={0}
										className={`rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 ${
											isRead
												? 'border-green-200 bg-green-50 hover:bg-green-100 focus:ring-green-200'
												: 'border-blue-300 bg-blue-100 hover:bg-blue-200 focus:ring-blue-200'
										}`}
										onClick={() => handleOpenNotification(notification)}
										onKeyDown={(event) => {
											if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space') {
												event.preventDefault()
												handleOpenNotification(notification)
											}
										}}
									>
										<div className="flex items-start justify-between gap-3">
											<p className={`text-sm font-semibold ${isRead ? 'text-green-900' : 'text-blue-900'}`}>
												{notification.title}
											</p>
											<span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isRead ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'}`}>
												{isRead ? 'Read' : 'Unread'}
											</span>
										</div>
										<p className={`mt-1 text-sm ${isRead ? 'text-green-700' : 'text-blue-700'}`}>
											{notification.message}
										</p>
										{notification.createdAt && (
											<p className={`mt-2 text-xs ${isRead ? 'text-green-700' : 'text-blue-700'}`}>
												{formatDateTime(notification.createdAt)}
											</p>
										)}
									</article>
								)
							})}
						</div>
					)}
				</div>
			</div>
		</main>
	)
}
