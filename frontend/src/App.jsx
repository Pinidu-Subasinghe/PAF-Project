import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'

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

  const isLoginPage = currentPath.startsWith('/login') || currentPath.startsWith('/auth')
  const isSignUpPage = currentPath.startsWith('/signup') || currentPath.startsWith('/register')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      {isSignUpPage ? <SignUpPage /> : isLoginPage ? <LoginPage /> : <HomePage />}
      <Footer />
    </div>
  )
}

export default App
