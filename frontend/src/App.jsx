import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToTopButton from './components/ScrollToTopButton'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ResourcesPage from './pages/ResourcesPage'
import ResourceDetailsCard from './components/ResourceDetailsCard'
import AboutUs from './components/AboutUs'
import BookingCreatePage from './pages/BookingCreatePage'
import { consumeGoogleOAuthRedirect } from './utils/googleOAuth'
import { readAuthSession, authSessionChangeEvent } from './utils/authSession'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [session, setSession] = useState(() => readAuthSession())

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)

    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [])

  useEffect(() => {
    const oauthResult = consumeGoogleOAuthRedirect()

    if (oauthResult.status === 'success') {
      window.history.replaceState(null, '', '/')
      setCurrentPath('/')
      return
    }

    if (oauthResult.status === 'error') {
      window.history.replaceState(null, '', '/login')
      setCurrentPath('/login')
    }
  }, [])

  useEffect(() => {
    const syncSession = () => setSession(readAuthSession())

    window.addEventListener('storage', syncSession)
    window.addEventListener(authSessionChangeEvent, syncSession)

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(authSessionChangeEvent, syncSession)
    }
  }, [])

  useEffect(() => {
    if (currentPath.startsWith('/bookings/my')) {
      if (!session) {
        window.history.replaceState(null, '', '/login')
        setCurrentPath('/login')
        return
      }

      const destination = session.role === 'ADMIN'
        ? '/admin-dashboard?tab=manage-bookings'
        : '/user-dashboard?tab=my-bookings'

      window.history.replaceState(null, '', destination)
      setCurrentPath(window.location.pathname)
      return
    }

    if (currentPath.startsWith('/bookings/all')) {
      if (session?.role === 'ADMIN') {
        const destination = '/admin-dashboard?tab=manage-bookings'
        window.history.replaceState(null, '', destination)
        setCurrentPath('/admin-dashboard')
      } else {
        window.history.replaceState(null, '', '/login')
        setCurrentPath('/login')
      }
    }
  }, [currentPath, session])

  const isLoginPage = currentPath.startsWith('/login') || currentPath.startsWith('/auth')
  const isSignUpPage = currentPath.startsWith('/signup') || currentPath.startsWith('/register')
  const isAdminDashboardPage = currentPath.startsWith('/admin-dashboard')
  const isUserDashboardPage = currentPath.startsWith('/user-dashboard')
  const isDashboardPage = isAdminDashboardPage || isUserDashboardPage
  const isAboutUsPage = currentPath.startsWith('/about-us')
  const isResourceDetailsPage = currentPath.startsWith('/resources/') && currentPath.length > '/resources/'.length
  const isResourcesPage = currentPath.startsWith('/resources') && !isResourceDetailsPage
  const isBookingCreatePage = /^\/bookings\/create\/\d+$/.test(currentPath)
  const isMyBookingsPage = currentPath.startsWith('/bookings/my')
  const isAllBookingsPage = currentPath.startsWith('/bookings/all')

  const isAuthPage = isLoginPage || isSignUpPage
  const showChrome = !isAuthPage
  const showScrollToTop = !isAuthPage && !isDashboardPage
  const showFooter = showChrome && !isDashboardPage

  const appShellClass = isDashboardPage
    ? 'h-screen'
    : 'min-h-screen'

  return (
    <div className={`${appShellClass} bg-slate-50 text-slate-900 flex flex-col`}>
      {showChrome && <Header />}
      <div className="flex-1 min-h-0">
        {isSignUpPage
          ? <SignUpPage />
          : isLoginPage
            ? <LoginPage />
            : isBookingCreatePage
              ? <BookingCreatePage />
            : isMyBookingsPage
              ? (session ? (session.role === 'ADMIN' ? <AdminDashboard /> : <UserDashboard />) : <LoginPage />)
            : isAllBookingsPage
              ? (session?.role === 'ADMIN' ? <AdminDashboard /> : <LoginPage />)
            : isResourceDetailsPage
                  ? <ResourceDetailsCard />
                : isResourcesPage
                  ? <ResourcesPage />
              : isAboutUsPage
                ? <AboutUs />
              : isDashboardPage
                ? (
                    isAdminDashboardPage
                      ? (
                          session
                            ? (session.role === 'ADMIN' ? <AdminDashboard /> : (
                                <main className="min-h-screen bg-slate-50">
                                  <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
                                    <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
                                    <p className="mt-2 text-sm text-slate-500">You do not have permission to view the admin dashboard.</p>
                                  </div>
                                </main>
                              ))
                            : <LoginPage />
                        )
                      : (
                          // user dashboard
                          session ? <UserDashboard /> : <LoginPage />
                        )
                  )
                : <HomePage />}
      </div>
      {showScrollToTop && <ScrollToTopButton />}
      {showFooter && <Footer />}
    </div>
  )
}

export default App
