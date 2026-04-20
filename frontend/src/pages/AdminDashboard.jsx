import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import Profile from '../components/user/Profile'
import ChangePassword from '../components/user/ChangePassword'
import { authSessionChangeEvent, readAuthSession } from '../utils/authSession'

const adminNavItems = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Campus operations',
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Your account details',
  },
  {
    id: 'change-password',
    label: 'Change password',
    description: 'Update account security',
  },
  {
    id: 'manage-resources',
    label: 'Add Resources',
    description: 'Add new campus facilities',
  },
]

function OverviewPanel({ session }) {
  const displayName = session?.fullName?.trim() || session?.email || 'Campus Admin'
  const role = session?.role ?? 'ADMIN'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Welcome back, {displayName}</h2>
        <p className="mt-1 text-sm text-slate-500">Role: {role}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active items</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">5 open tasks</p>
          <p className="mt-1 text-xs text-slate-500">Approvals, alerts, and reports.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">System status</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">All systems nominal</p>
          <p className="mt-1 text-xs text-slate-500">No critical incidents.</p>
        </div>
      </div>
    </div>
  )
}

function PlaceholderPanel({ title, description, items }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function readRequestedTab(navItems) {
  const queryParams = new URLSearchParams(window.location.search)
  const requestedTab = queryParams.get('tab')?.trim()

  if (!requestedTab) {
    return null
  }

  return navItems.some((item) => item.id === requestedTab) ? requestedTab : null
}

export default function AdminDashboard() {
  const [session, setSession] = useState(() => readAuthSession())

  useEffect(() => {
    const syncSession = () => {
      setSession(readAuthSession())
    }

    window.addEventListener('storage', syncSession)
    window.addEventListener(authSessionChangeEvent, syncSession)

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(authSessionChangeEvent, syncSession)
    }
  }, [])

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-500">Please sign in to view the admin dashboard.</p>
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

  const navItems = useMemo(() => adminNavItems, [])
  const [activeItemId, setActiveItemId] = useState(() => readRequestedTab(navItems) ?? navItems[0].id)

  const handleSelect = (id) => {
    if (id === 'manage-resources') {
      window.history.pushState(null, '', '/admin/resources')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }

    setActiveItemId(id)
  }

  useEffect(() => {
    setActiveItemId((currentActiveItemId) => {
      const requestedTab = readRequestedTab(navItems)
      if (requestedTab) {
        return requestedTab
      }

      return navItems.some((item) => item.id === currentActiveItemId)
        ? currentActiveItemId
        : navItems[0].id
    })
  }, [navItems])

  useEffect(() => {
    const syncActiveItemWithLocation = () => {
      const requestedTab = readRequestedTab(navItems)
      if (requestedTab) {
        setActiveItemId(requestedTab)
      }
    }

    window.addEventListener('popstate', syncActiveItemWithLocation)
    window.addEventListener('hashchange', syncActiveItemWithLocation)

    return () => {
      window.removeEventListener('popstate', syncActiveItemWithLocation)
      window.removeEventListener('hashchange', syncActiveItemWithLocation)
    }
  }, [navItems])

  const contentById = {
    overview: <OverviewPanel session={session} />,
    profile: <Profile session={session} />,
    'change-password': <ChangePassword session={session} />,
    'admin-tools': (
      <PlaceholderPanel
        title="Admin tools"
        description="Manage approvals, users, and system updates."
        items={[
          { title: 'Resource manager', detail: 'Open /admin/resources to manage the facilities catalogue.' },
          { title: 'Facility alerts', detail: '2 new incidents' },
        ]}
      />
    ),
  }

  const activeContent = contentById[activeItemId] ?? contentById.overview

  return (
    <DashboardShell
      title="Admin Dashboard"
      subtitle="Monitor campus operations and administrative tasks."
      items={navItems}
      activeItemId={activeItemId}
      onSelect={handleSelect}
    >
      {activeContent}
    </DashboardShell>
  )
}
