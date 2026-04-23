import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import Profile from '../components/user/Profile'
import ChangePassword from '../components/user/ChangePassword'
import AssignedTasks from '../components/technician/AssignedTasks'
import ResolvedTasks from '../components/technician/ResolvedTasks'
import { authSessionChangeEvent, readAuthSession } from '../utils/authSession'
import { technicianNavItems } from '../utils/dashboardNav'

function readRequestedTab(navItems) {
	const queryParams = new URLSearchParams(window.location.search)
	const requestedTab = queryParams.get('tab')?.trim()

	if (!requestedTab) {
		return null
	}

	return navItems.some((item) => item.id === requestedTab) ? requestedTab : null
}

export default function TechnicianDashboard() {
	const [session, setSession] = useState(() => readAuthSession())
	const navItems = useMemo(() => technicianNavItems, [])
	const [activeItemId, setActiveItemId] = useState(() => readRequestedTab(navItems) ?? navItems[0].id)

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
					<p className="mt-2 text-sm text-slate-500">Please sign in to view the technician dashboard.</p>
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

	const contentById = {
		profile: <Profile session={session} />,
		'change-password': <ChangePassword session={session} />,
		assigned: <AssignedTasks session={session} />,
		resolved: <ResolvedTasks session={session} />,
	}

	const activeContent = contentById[activeItemId] ?? contentById.assigned

	return (
		<DashboardShell
			title="Technician Dashboard"
			subtitle="Handle your assigned incident tickets."
			items={navItems}
			activeItemId={activeItemId}
			onSelect={setActiveItemId}
		>
			{activeContent}
		</DashboardShell>
	)
}

