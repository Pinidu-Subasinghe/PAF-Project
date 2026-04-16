import RegisterForm from '../components/RegisterForm'
import LoginForm from '../components/LoginForm'

export default function AuthPage() {
  return (
    <main className="relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-amber-100 via-amber-50 to-blue-100 px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_30%_30%,#f9f2d7_0%,#f0c172_58%,transparent_75%)]"
      ></div>
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-36 -right-36 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_40%_40%,#bfdcfb_0%,#80aef3_52%,transparent_75%)]"
      ></div>

      <section className="relative z-10 w-full max-w-6xl rounded-3xl border border-amber-900/20 bg-white/90 p-6 shadow-[0_22px_52px_rgba(82,56,25,0.18)] backdrop-blur-sm sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Authentication</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-stone-900 sm:text-5xl">Access Your Account</h1>
        <p className="mt-3 text-sm text-stone-600 sm:text-base">
          Register a new account or sign in with your existing credentials.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article id="register" className="rounded-2xl border border-amber-700/15 bg-amber-50/35 p-5">
            <h2 className="font-serif text-2xl text-stone-900">Register</h2>
            <p className="mt-1 text-sm text-stone-600">Create a user account with full name, email, and password.</p>
            <div className="mt-4">
              <RegisterForm />
            </div>
          </article>

          <article id="login" className="rounded-2xl border border-sky-700/15 bg-sky-50/35 p-5">
            <h2 className="font-serif text-2xl text-stone-900">Login</h2>
            <p className="mt-1 text-sm text-stone-600">Sign in to request a token for protected API access.</p>
            <div className="mt-4">
              <LoginForm />
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}