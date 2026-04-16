import { useEffect, useState } from 'react'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Modules', href: '/#modules' },
  { label: 'Workflow', href: '/#workflow' },
  { label: 'Deliverables', href: '/#deliverables' },
]

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const closeMobileMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-300/70 bg-[#f9fcfd]/90 backdrop-blur-md supports-[backdrop-filter]:bg-[#f9fcfd]/80">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 md:py-4">
          <a href="/" className="font-serif text-lg font-semibold tracking-wide text-slate-900 sm:text-xl">
            UniPilot
          </a>

          <div className="hidden items-center gap-3 md:flex">
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  className="px-1 py-1.5 transition-colors hover:text-slate-900"
                  href={link.href}
                >
                  {link.label}
                </a>
              ))}
            </nav>

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
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-slate-500 hover:text-slate-900 md:hidden"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle navigation menu"
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <span className="sr-only">Toggle navigation menu</span>
            <span className="relative h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-5 rounded bg-current transition-transform duration-300 ${
                  isMenuOpen ? 'translate-y-[7px] rotate-45' : ''
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] h-0.5 w-5 rounded bg-current transition-opacity duration-300 ${
                  isMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute left-0 top-[14px] h-0.5 w-5 rounded bg-current transition-transform duration-300 ${
                  isMenuOpen ? '-translate-y-[7px] -rotate-45' : ''
                }`}
              />
            </span>
          </button>
        </div>

        <div
          id="mobile-menu"
          className={`overflow-hidden transition-[max-height,opacity,padding] duration-300 ease-out md:hidden ${
            isMenuOpen ? 'max-h-[28rem] pb-4 opacity-100' : 'max-h-0 pb-0 opacity-0'
          }`}
        >
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-900/5">
            <nav className="grid gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  href={link.href}
                  onClick={closeMobileMenu}
                >
                  {link.label}
                </a>
              ))}
            </nav>

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
          </div>
        </div>
      </div>
    </header>
  )
}