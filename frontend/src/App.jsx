import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import { consumeGoogleOAuthRedirect } from './utils/googleOAuth'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

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

  const isLoginPage = currentPath.startsWith('/login') || currentPath.startsWith('/auth')
  const isSignUpPage = currentPath.startsWith('/signup') || currentPath.startsWith('/register')

  const isAuthPage = isLoginPage || isSignUpPage

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {!isAuthPage && <Header />}
      {isSignUpPage ? <SignUpPage /> : isLoginPage ? <LoginPage /> : <HomePage />}
      {!isAuthPage && <Footer />}
    </div>
  )
}

export default App
