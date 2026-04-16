import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '../components/user/DashboardShell'
import Profile from '../components/user/Profile'
import { authSessionChangeEvent, readAuthSession } from '../utils/authSession'

const userNavItems = [
	{
		id: 'overview',
		label: 'Overview',
		description: 'Quick status snapshot',
	},
	{
		id: 'profile',
		label: 'Profile',
		description: 'Your account details',
	},
	{
		id: 'bookings',
		label: 'Bookings',
		description: 'Spaces and reservations',
	},
	{
		id: 'requests',
		label: 'Requests',
		description: 'Maintenance and support',
	},
]

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
		id: 'admin-tools',
		label: 'Admin tools',
		description: 'Users and approvals',
	},
]

function OverviewPanel({ session }) {
	const displayName = session?.fullName?.trim() || session?.email || 'Campus User'
	const role = session?.role ?? 'USER'

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-xl font-semibold text-slate-900">Welcome back, {displayName}</h2>
				<p className="mt-1 text-sm text-slate-500">Role: {role}</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active items</p>
					<p className="mt-2 text-lg font-semibold text-slate-900">3 open tasks</p>
					<p className="mt-1 text-xs text-slate-500">Bookings, requests, and alerts.</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next reminder</p>
					<p className="mt-2 text-lg font-semibold text-slate-900">Today, 3:00 PM</p>
					<p className="mt-1 text-xs text-slate-500">Weekly dashboard review.</p>
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

export default function UserDashboard() {
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
					<p className="mt-2 text-sm text-slate-500">
						Please sign in to view your dashboard and profile information.
					</p>
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

	const role = session?.role ?? 'USER'
	const navItems = useMemo(() => (role === 'ADMIN' ? adminNavItems : userNavItems), [role])
	const [activeItemId, setActiveItemId] = useState(navItems[0].id)

	useEffect(() => {
		setActiveItemId(navItems[0].id)
	}, [navItems])

	const contentById = {
		overview: <OverviewPanel session={session} />,
		profile: <Profile session={session} />,
		bookings: (
			<PlaceholderPanel
				title="Bookings"
				description="Review your recent reservations and upcoming space usage."
				items={[
					{ title: 'Library study room', detail: 'Tomorrow, 10:00 AM' },
					{ title: 'Conference hall', detail: 'Friday, 2:00 PM' },
				]}
			/>
		),
		requests: (
			<PlaceholderPanel
				title="Service requests"
				description="Track maintenance and support requests in progress."
				items={[
					{ title: 'AC maintenance', detail: 'Status: Scheduled' },
					{ title: 'Projector repair', detail: 'Status: In review' },
				]}
			/>
		),
		'admin-tools': (
			<PlaceholderPanel
				title="Admin tools"
				description="Manage approvals, users, and system updates."
				items={[
					{ title: 'User approvals', detail: '4 pending requests' },
					{ title: 'Facility alerts', detail: '2 new incidents' },
				]}
			/>
		),
	}

	const activeContent = contentById[activeItemId] ?? contentById.overview

	return (
		<DashboardShell
			title={role === 'ADMIN' ? 'Admin Dashboard' : 'User Dashboard'}
			subtitle={role === 'ADMIN'
				? 'Monitor campus operations and administrative tasks.'
				: 'Track your campus activity and services in one place.'}
			items={navItems}
			activeItemId={activeItemId}
			onSelect={setActiveItemId}
		>
			{activeContent}
		</DashboardShell>
	)
}
