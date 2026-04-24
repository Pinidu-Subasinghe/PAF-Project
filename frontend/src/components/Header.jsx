import { useEffect, useRef, useState, useCallback } from 'react'
import { HiOutlineBell, HiOutlineUserCircle } from 'react-icons/hi2'
import NotificationFloatingModal from './NotificationFloatingModal'
import { getMyNotifications, markNotificationAsRead } from '../api/api'
import uniPilotBrandLogo from '../assets/UniPilot2-nobg.png'
import {
  authSessionChangeEvent,
  clearAuthSession,
  readAuthSession,
} from '../utils/authSession'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Facilities', href: '/resources' },
  { label: 'About Us', href: '/about-us' },
  { label: 'Modules', href: '/#modules' },
  { label: 'Workflow', href: '/#workflow' },
  { label: 'Deliverables', href: '/#deliverables' },
]

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

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false)
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth < 768)
  const [notifications, setNotifications] = useState([])
  const [notificationsTotal, setNotificationsTotal] = useState(0)
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [authSession, setAuthSession] = useState(() => readAuthSession())
  const profileMenuRef = useRef(null)
  const notificationMenuRef = useRef(null)
  const notificationsFetchIdRef = useRef(0)

  const isAuthenticated = Boolean(authSession)
  const resolvedNavLinks = navLinks
  const profileName = authSession?.fullName?.trim() || authSession?.email || 'Campus User'
  const profileEmail = authSession?.email || 'Logged in'
  const unreadNotificationCount = notifications.filter((n) => !n.read).length
  const hasNotifications = unreadNotificationCount > 0
  const unreadBadgeLabel = unreadNotificationCount > 9 ? '9+' : unreadNotificationCount

  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth < 768
      setIsMobileView(mobileView)

      if (!mobileView) {
        setIsMenuOpen(false)
      }

      if (mobileView) {
        setIsProfileMenuOpen(false)
      }

      setIsNotificationMenuOpen(false)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const syncAuthSession = () => {
      setAuthSession(readAuthSession())
    }

    window.addEventListener('storage', syncAuthSession)
    window.addEventListener(authSessionChangeEvent, syncAuthSession)

    return () => {
      window.removeEventListener('storage', syncAuthSession)
      window.removeEventListener(authSessionChangeEvent, syncAuthSession)
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    if (!authSession?.token) {
      setNotifications([])
      setIsNotificationsLoading(false)
      setNotificationsError('')
      setIsNotificationMenuOpen(false)
      return
    }

    const currentId = ++notificationsFetchIdRef.current
    setIsNotificationsLoading(true)
    setNotificationsError('')

    try {
      const response = await getMyNotifications()
      if (notificationsFetchIdRef.current !== currentId) return

      if (Array.isArray(response)) {
        setNotifications(response)
        setNotificationsTotal(response.length)
      } else if (response && Array.isArray(response.notifications)) {
        setNotifications(response.notifications)
        setNotificationsTotal(Number(response.total) || response.notifications.length)
      } else {
        setNotifications([])
        setNotificationsTotal(0)
      }
    } catch (error) {
      if (notificationsFetchIdRef.current !== currentId) return
      setNotifications([])
      setNotificationsError(
        error instanceof Error ? error.message : 'Unable to load notifications right now.',
      )
    } finally {
      if (notificationsFetchIdRef.current === currentId) {
        setIsNotificationsLoading(false)
      }
    }
  }, [authSession?.token])

  useEffect(() => {
    loadNotifications()
    return () => {
      notificationsFetchIdRef.current++
    }
  }, [authSession?.token, authSession?.passwordSetupRequired, loadNotifications])

  useEffect(() => {
    const handler = () => loadNotifications()
    window.addEventListener('unipilot-notification-refresh', handler)
    return () => window.removeEventListener('unipilot-notification-refresh', handler)
  }, [loadNotifications])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }

      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setIsNotificationMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick)
    }
  }, [])

  const closeMobileMenu = () => {
    setIsMenuOpen(false)
    setIsNotificationMenuOpen(false)
  }

  const handleLogout = () => {
    clearAuthSession()
    setIsProfileMenuOpen(false)
    setIsNotificationMenuOpen(false)
    setIsMenuOpen(false)
    navigateTo('/')
  }

  const toggleProfileMenu = () => {
    setIsNotificationMenuOpen(false)
    setIsProfileMenuOpen((prev) => !prev)
  }

  const toggleNotificationMenu = () => {
    setIsProfileMenuOpen(false)
    setIsNotificationMenuOpen((prev) => !prev)
  }

  const handleNotificationNavigate = async (notification) => {
    const destination = resolveNotificationDestination(notification, authSession)

    if (notification?.id) {
      try {
        await markNotificationAsRead(notification.id)
        setNotifications((currentNotifications) => (
          currentNotifications.map((item) => (
            item.id === notification.id ? { ...item, read: true, readAt: new Date().toISOString() } : item
          ))
        ))
        setNotificationsError('')
      } catch (error) {
        setNotificationsError(
          error instanceof Error
            ? error.message
            : 'Unable to update notification status right now.',
        )
      }
    }

    setIsNotificationMenuOpen(false)
    setIsMenuOpen(false)
    navigateTo(destination)
  }

  const notificationBell = isAuthenticated && (
    <div className="relative" ref={notificationMenuRef}>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
        aria-expanded={isNotificationMenuOpen}
        aria-label="Open notifications"
        onClick={toggleNotificationMenu}
      >
        <HiOutlineBell className="h-5 w-5" />
        {hasNotifications && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadBadgeLabel}
          </span>
        )}
      </button>

      <NotificationFloatingModal
        isOpen={isNotificationMenuOpen}
        notifications={notifications}
        isLoading={isNotificationsLoading}
        errorMessage={notificationsError}
        unreadBadgeLabel={unreadBadgeLabel}
        onNavigate={handleNotificationNavigate}
        total={notificationsTotal}
      />
    </div>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-slate-300/70 bg-[#f9fcfd]/90 backdrop-blur-md supports-backdrop-filter:bg-[#f9fcfd]/80">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 md:py-4">
          <a href="/" className="inline-flex items-center gap-1 font-serif text-lg font-semibold tracking-wide text-slate-900 sm:text-xl">
            <img
              src={uniPilotBrandLogo}
              alt="UniPilot"
              className="h-9 w-9 object-contain sm:h-9 sm:w-9"
            />
            <span>UniPilot</span>
          </a>

          <div className="hidden items-center gap-3 md:flex">
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
              {resolvedNavLinks.map((link) => (
                <a
                  key={link.label}
                  className="px-1 py-1.5 transition-colors hover:text-slate-900"
                  href={link.href}
                  target={link.newTab ? '_blank' : undefined}
                  rel={link.newTab ? 'noreferrer' : undefined}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {!isMobileView && notificationBell}

                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                    aria-expanded={isProfileMenuOpen}
                    aria-label="Open profile menu"
                    onClick={toggleProfileMenu}
                  >
                    <HiOutlineUserCircle className="h-6 w-6" />
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <a
                          href={authSession ? getDashboardHomePath(authSession.role) : '/login'}
                          className="truncate text-sm font-semibold text-slate-900 hover:underline"
                        >
                          {profileName}
                        </a>
                        <p className="truncate text-xs text-slate-500">{profileEmail}</p>
                      </div>

                      <button
                        type="button"
                        className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                        onClick={handleLogout}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  className="rounded-full border border-slate-400 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-600 hover:text-slate-900"
                  href="/signup"
                >
                  Sign up
                </a>
                <a
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  href="/login"
                >
                  Login
                </a>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            {isMobileView && notificationBell}

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-slate-500 hover:text-slate-900"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle navigation menu"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              <span className="sr-only">Toggle navigation menu</span>
              <span className="relative h-4 w-5">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 rounded bg-current transition-transform duration-300 ${
                    isMenuOpen ? 'translate-y-1.75 rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-1.75 h-0.5 w-5 rounded bg-current transition-opacity duration-300 ${
                    isMenuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`absolute left-0 top-3.5 h-0.5 w-5 rounded bg-current transition-transform duration-300 ${
                    isMenuOpen ? '-translate-y-1.75 -rotate-45' : ''
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={`overflow-hidden transition-[max-height,opacity,padding] duration-300 ease-out md:hidden ${
            isMenuOpen ? 'max-h-112 pb-4 opacity-100' : 'max-h-0 pb-0 opacity-0'
          }`}
        >
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-900/5">
            <nav className="grid gap-1">
              {resolvedNavLinks.map((link) => (
                <a
                  key={link.label}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  href={link.href}
                  target={link.newTab ? '_blank' : undefined}
                  rel={link.newTab ? 'noreferrer' : undefined}
                  onClick={closeMobileMenu}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {isAuthenticated ? (
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <HiOutlineUserCircle className="h-7 w-7 text-slate-700" />
                  <div className="min-w-0">
                    <a
                      href={authSession ? getDashboardHomePath(authSession.role) : '/login'}
                      className="truncate text-sm font-semibold text-slate-900 hover:underline"
                      onClick={closeMobileMenu}
                    >
                      {profileName}
                    </a>
                    <p className="truncate text-xs text-slate-500">{profileEmail}</p>
                  </div>
                </div>



                <button
                  type="button"
                  className="block w-full rounded-xl border border-slate-400 px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-600 hover:text-slate-900"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3">
                <a
                  className="block rounded-xl border border-slate-400 px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-600 hover:text-slate-900"
                  href="/signup"
                  onClick={closeMobileMenu}
                >
                  Sign up
                </a>
                <a
                  className="block rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                  href="/login"
                  onClick={closeMobileMenu}
                >
                  Login
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
