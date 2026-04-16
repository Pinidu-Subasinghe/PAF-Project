export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" className="font-serif text-lg font-semibold tracking-wide text-slate-900">
          PAF Project
        </a>

        <nav className="flex items-center gap-2 text-sm font-medium text-slate-600 sm:gap-4">
          <a className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" href="/">
            Home
          </a>
          <a className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" href="/auth#register">
            Sign up
          </a>
          <a className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" href="/auth#login">
            Login
          </a>
          <a className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" href="/#features">
            Features
          </a>
          <a className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" href="/#workflow">
            Workflow
          </a>
          <a className="rounded-full bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700" href="/auth">
            Auth
          </a>
        </nav>
      </div>
    </header>
  )
}