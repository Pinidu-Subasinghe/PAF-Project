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
import AdminResourcesPage from './components/admin/AdminResourcesPage'
import AllResourcesPage from './pages/AllResourcesPage'
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

  const isLoginPage = currentPath.startsWith('/login') || currentPath.startsWith('/auth')
  const isSignUpPage = currentPath.startsWith('/signup') || currentPath.startsWith('/register')
  const isDashboardPage = currentPath.startsWith('/dashboard') || currentPath.startsWith('/user')
  const isResourcesPage = currentPath.startsWith('/resources')
  const isAdminResourcesPage = currentPath.startsWith('/admin/resources')
  const isAllResourcesPage = currentPath.startsWith('/admin/all-resources')

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
            : isAdminResourcesPage
              ? <AdminResourcesPage />
              : isAllResourcesPage
                ? <AllResourcesPage />
                : isResourcesPage
                  ? <ResourcesPage />
              : isDashboardPage
                ? (session?.role === 'ADMIN' ? <AdminDashboard /> : <UserDashboard />)
                : <HomePage />}
      </div>
      {showScrollToTop && <ScrollToTopButton />}
      {showFooter && <Footer />}
    </div>
  )
}

export default App
