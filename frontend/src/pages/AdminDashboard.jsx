import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import Profile from '../components/user/Profile'
import ChangePassword from '../components/user/ChangePassword'
import AdminResourceManagement from '../components/admin/AdminResourceManagement'
import AdminAddResource from '../components/admin/AdminAddResource'
import AdminResourceInfoCard from '../components/admin/AdminResourceInfoCard'
import AdminResourceAnalytics from '../components/admin/AdminResourceAnalytics'
import AdminUserManagement from '../components/admin/AdminUserManagement'
import AdminTickets from '../components/admin/AdminTickets'
import BookingList from '../components/booking/BookingList'
import { authSessionChangeEvent, readAuthSession } from '../utils/authSession'
import { adminNavItems } from '../utils/dashboardNav'

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
  const [selectedResourceId, setSelectedResourceId] = useState(null)
  const [resourceView, setResourceView] = useState('list')
  const navItems = useMemo(() => adminNavItems, [])
  const [activeItemId, setActiveItemId] = useState(() => readRequestedTab(navItems) ?? navItems[0].id)

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

  const handleSelect = (id) => {
    setActiveItemId(id)
    if (id === 'manage-resources') {
      setSelectedResourceId(null)
      setResourceView('list')
      return
    }

    setSelectedResourceId(null)
    setResourceView('list')
  }

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

  const handleResourceSelect = (resourceId) => {
    setSelectedResourceId(resourceId)
    setResourceView('details')
    setActiveItemId('manage-resources')
  }

  const handleBackToResourceList = () => {
    setSelectedResourceId(null)
    setResourceView('list')
    setActiveItemId('manage-resources')
  }

  const handleViewResourceAnalytics = () => {
    setSelectedResourceId(null)
    setResourceView('analytics')
    setActiveItemId('manage-resources')
  }

  const contentById = {
    profile: <Profile session={session} />,
    'change-password': <ChangePassword session={session} />,
    'add-resources': <AdminAddResource />,
    'manage-resources': resourceView === 'details' && selectedResourceId
      ? (
          <AdminResourceInfoCard
            resourceId={selectedResourceId}
            onBack={handleBackToResourceList}
            onDeleted={handleBackToResourceList}
          />
        )
      : resourceView === 'analytics'
        ? <AdminResourceAnalytics onBack={handleBackToResourceList} />
        : <AdminResourceManagement onSelectResource={handleResourceSelect} onViewAnalytics={handleViewResourceAnalytics} />,
    'user-management': <AdminUserManagement />,
    'manage-bookings': (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Manage bookings</h2>
          <p className="mt-1 text-sm text-slate-500">Review all booking requests and process approvals, rejections, and cancellations.</p>
        </div>
        <BookingList scope="all" />
      </div>
    ),
    tickets: (
      <AdminTickets />
    ),
  }

  const activeContent = contentById[activeItemId] ?? contentById.profile

  return (
    <DashboardShell
      title="Admin Dashboard"
      // subtitle="Monitor campus operations and administrative tasks."
      items={navItems}
      activeItemId={activeItemId}
      onSelect={handleSelect}
    >
      {activeContent}
    </DashboardShell>
  )
}
