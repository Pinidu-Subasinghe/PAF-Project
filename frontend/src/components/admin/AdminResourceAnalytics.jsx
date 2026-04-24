import { useCallback, useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getAllBookings, getIncidentTickets, getResources } from '../../api/api'

function formatEnumLabel(value) {
	return value
		?.toLowerCase()
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}

function asArray(value) {
	return Array.isArray(value) ? value : []
}

function asNumber(value) {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : 0
}

function readResourceId(source) {
	if (source === null || source === undefined) return null
	if (typeof source === 'number') return source
	if (typeof source === 'string' && source.trim()) {
		const parsed = Number(source)
		return Number.isFinite(parsed) ? parsed : null
	}
	return null
}

function percentage(part, total) {
	if (!total) return 0
	return Math.round((part / total) * 100)
}

const OPEN_TICKET_STATUSES = new Set(['OPEN', 'IN_PROGRESS'])

export default function AdminResourceAnalytics({ onBack } = {}) {
	const [resources, setResources] = useState([])
	const [bookings, setBookings] = useState([])
	const [tickets, setTickets] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [isDownloading, setIsDownloading] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')

	const loadAnalytics = useCallback(async () => {
		setIsLoading(true)
		setErrorMessage('')

		try {
			const [resourcesResponse, bookingsResponse, ticketsResponse] = await Promise.all([
				getResources(),
				getAllBookings(),
				getIncidentTickets(),
			])

			setResources(asArray(resourcesResponse))
			setBookings(asArray(bookingsResponse))
			setTickets(asArray(ticketsResponse))
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Unable to load analytics right now.')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadAnalytics()
	}, [loadAnalytics])

	const resourceAnalytics = useMemo(() => {
		const totalResources = resources.length
		const activeResources = resources.filter((resource) => resource?.status === 'ACTIVE').length
		const outOfServiceResources = resources.filter((resource) => resource?.status === 'OUT_OF_SERVICE').length
		const equipmentResources = resources.filter((resource) => resource?.type === 'EQUIPMENT').length

		const totalCapacity = resources.reduce((sum, resource) => sum + asNumber(resource?.capacity), 0)
		const averageCapacity = totalResources ? Math.round(totalCapacity / totalResources) : 0

		const byTypeMap = resources.reduce((acc, resource) => {
			const key = resource?.type || 'UNKNOWN'
			acc[key] = (acc[key] || 0) + 1
			return acc
		}, {})

		const byType = Object.entries(byTypeMap)
			.map(([type, count]) => ({ type, count }))
			.sort((a, b) => b.count - a.count)

		return {
			totalResources,
			activeResources,
			outOfServiceResources,
			equipmentResources,
			totalCapacity,
			averageCapacity,
			byType,
		}
	}, [resources])

	const bookingAnalytics = useMemo(() => {
		const totalBookings = bookings.length

		const statusMap = bookings.reduce((acc, booking) => {
			const key = booking?.status || 'UNKNOWN'
			acc[key] = (acc[key] || 0) + 1
			return acc
		}, {})

		const byStatus = Object.entries(statusMap)
			.map(([status, count]) => ({ status, count }))
			.sort((a, b) => b.count - a.count)

		const approvedBookings = statusMap.APPROVED || 0
		const pendingBookings = statusMap.PENDING || 0

		const byDateMap = bookings.reduce((acc, booking) => {
			const key = booking?.date || booking?.createdAt?.slice?.(0, 10) || 'Unknown'
			acc[key] = (acc[key] || 0) + 1
			return acc
		}, {})

		const busiestDates = Object.entries(byDateMap)
			.map(([date, count]) => ({ date, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5)

		return {
			totalBookings,
			byStatus,
			approvedBookings,
			pendingBookings,
			busiestDates,
		}
	}, [bookings])

	const ticketAnalytics = useMemo(() => {
		const totalTickets = tickets.length

		const statusMap = tickets.reduce((acc, ticket) => {
			const key = ticket?.status || 'UNKNOWN'
			acc[key] = (acc[key] || 0) + 1
			return acc
		}, {})

		const priorityMap = tickets.reduce((acc, ticket) => {
			const key = ticket?.priority || 'UNKNOWN'
			acc[key] = (acc[key] || 0) + 1
			return acc
		}, {})

		const byStatus = Object.entries(statusMap)
			.map(([status, count]) => ({ status, count }))
			.sort((a, b) => b.count - a.count)

		const byPriority = Object.entries(priorityMap)
			.map(([priority, count]) => ({ priority, count }))
			.sort((a, b) => b.count - a.count)

		const openTickets = Array.from(OPEN_TICKET_STATUSES).reduce((sum, status) => sum + (statusMap[status] || 0), 0)

		return {
			totalTickets,
			byStatus,
			byPriority,
			openTickets,
		}
	}, [tickets])

	const resourceImpactRows = useMemo(() => {
		const bookingCountByResource = bookings.reduce((acc, booking) => {
			const resourceId = readResourceId(booking?.resourceId ?? booking?.resource?.id)
			if (!resourceId) return acc

			acc[resourceId] = (acc[resourceId] || 0) + 1
			return acc
		}, {})

		const ticketCountByResource = tickets.reduce((acc, ticket) => {
			const resourceId = readResourceId(ticket?.resourceId ?? ticket?.resource?.id)
			if (!resourceId) return acc

			acc[resourceId] = (acc[resourceId] || 0) + 1
			return acc
		}, {})

		const openTicketCountByResource = tickets.reduce((acc, ticket) => {
			const resourceId = readResourceId(ticket?.resourceId ?? ticket?.resource?.id)
			if (!resourceId) return acc
			if (!OPEN_TICKET_STATUSES.has(ticket?.status)) return acc

			acc[resourceId] = (acc[resourceId] || 0) + 1
			return acc
		}, {})

		const rows = resources.map((resource) => {
			const bookingCount = bookingCountByResource[resource.id] || 0
			const ticketCount = ticketCountByResource[resource.id] || 0
			const openTicketCount = openTicketCountByResource[resource.id] || 0

			return {
				resourceId: resource.id,
				name: resource.name || `Resource ${resource.id}`,
				type: resource.type || 'UNKNOWN',
				status: resource.status || 'UNKNOWN',
				bookingCount,
				ticketCount,
				openTicketCount,
				healthScore: Math.max(0, 100 - (openTicketCount * 15 + ticketCount * 5)),
			}
		})

		const hasLinkedEvents = rows.some((row) => row.bookingCount > 0 || row.ticketCount > 0)
		if (!hasLinkedEvents) {
			return rows
				.sort((a, b) => a.name.localeCompare(b.name))
				.slice(0, 8)
		}

		return rows
			.sort((a, b) => (b.bookingCount + b.ticketCount) - (a.bookingCount + a.ticketCount))
			.slice(0, 8)
	}, [resources, bookings, tickets])

	const maxTypeCount = resourceAnalytics.byType[0]?.count || 1
	const maxBookingStatusCount = bookingAnalytics.byStatus[0]?.count || 1
	const maxTicketStatusCount = ticketAnalytics.byStatus[0]?.count || 1
	const maxPriorityCount = ticketAnalytics.byPriority[0]?.count || 1

	const handleDownloadPdf = () => {
		setIsDownloading(true)

		try {
			const doc = new jsPDF({ unit: 'pt', format: 'a4' })
			const pageWidth = doc.internal.pageSize.getWidth()
			const generatedAt = new Date().toLocaleString()

			doc.setFillColor(15, 23, 42)
			doc.rect(0, 0, pageWidth, 88, 'F')

			doc.setTextColor(255, 255, 255)
			doc.setFont('helvetica', 'bold')
			doc.setFontSize(20)
			doc.text('Resource Analytics Report', 40, 40)
			doc.setFont('helvetica', 'normal')
			doc.setFontSize(10)
			doc.text(`Generated: ${generatedAt}`, 40, 60)
			doc.text('Scope: Resources, Bookings, Incident Tickets', 40, 75)

			doc.setTextColor(15, 23, 42)
			doc.setFont('helvetica', 'bold')
			doc.setFontSize(13)
			doc.text('Executive Summary', 40, 120)

			const summaryCards = [
				['Total Resources', `${resourceAnalytics.totalResources}`],
				['Active Resources', `${resourceAnalytics.activeResources}`],
				['Total Bookings', `${bookingAnalytics.totalBookings}`],
				['Open Tickets', `${ticketAnalytics.openTickets}`],
				['Total Capacity', `${resourceAnalytics.totalCapacity}`],
				['Avg Capacity', `${resourceAnalytics.averageCapacity}`],
			]

			summaryCards.forEach(([title, value], index) => {
				const col = index % 3
				const row = Math.floor(index / 3)
				const cardX = 40 + col * 178
				const cardY = 132 + row * 72
				doc.setFillColor(248, 250, 252)
				doc.setDrawColor(226, 232, 240)
				doc.roundedRect(cardX, cardY, 164, 58, 8, 8, 'FD')
				doc.setFont('helvetica', 'normal')
				doc.setFontSize(9)
				doc.setTextColor(100, 116, 139)
				doc.text(title, cardX + 10, cardY + 20)
				doc.setFont('helvetica', 'bold')
				doc.setFontSize(16)
				doc.setTextColor(15, 23, 42)
				doc.text(value, cardX + 10, cardY + 42)
			})

			autoTable(doc, {
				startY: 292,
				head: [['Resource Type', 'Count']],
				body: resourceAnalytics.byType.map((row) => [formatEnumLabel(row.type), row.count]),
				theme: 'grid',
				headStyles: { fillColor: [15, 118, 110] },
				styles: { fontSize: 10 },
				margin: { left: 40, right: 40 },
			})

			autoTable(doc, {
				startY: doc.lastAutoTable.finalY + 14,
				head: [['Booking Status', 'Count']],
				body: bookingAnalytics.byStatus.map((row) => [formatEnumLabel(row.status), row.count]),
				theme: 'grid',
				headStyles: { fillColor: [217, 119, 6] },
				styles: { fontSize: 10 },
				margin: { left: 40, right: 40 },
			})

			autoTable(doc, {
				startY: doc.lastAutoTable.finalY + 14,
				head: [['Ticket Status', 'Count']],
				body: ticketAnalytics.byStatus.map((row) => [formatEnumLabel(row.status), row.count]),
				theme: 'grid',
				headStyles: { fillColor: [79, 70, 229] },
				styles: { fontSize: 10 },
				margin: { left: 40, right: 40 },
			})

			doc.addPage()

			doc.setFont('helvetica', 'bold')
			doc.setFontSize(14)
			doc.setTextColor(15, 23, 42)
			doc.text('Top Booking Dates', 40, 42)

			autoTable(doc, {
				startY: 52,
				head: [['Date', 'Total Bookings']],
				body: bookingAnalytics.busiestDates.length
					? bookingAnalytics.busiestDates.map((row) => [row.date, row.count])
					: [['No booking activity data available', '-']],
				theme: 'striped',
				headStyles: { fillColor: [15, 23, 42] },
				styles: { fontSize: 10 },
				margin: { left: 40, right: 40 },
			})

			doc.setFont('helvetica', 'bold')
			doc.setFontSize(14)
			doc.text('Resource Health And Impact', 40, doc.lastAutoTable.finalY + 24)

			autoTable(doc, {
				startY: doc.lastAutoTable.finalY + 32,
				head: [['Resource', 'Type', 'Status', 'Bookings', 'Tickets', 'Open', 'Health Score']],
				body: resourceImpactRows.map((row) => [
					row.name,
					formatEnumLabel(row.type),
					formatEnumLabel(row.status),
					row.bookingCount,
					row.ticketCount,
					row.openTicketCount,
					row.healthScore,
				]),
				theme: 'grid',
				headStyles: { fillColor: [190, 24, 93] },
				styles: { fontSize: 9, cellPadding: 5 },
				margin: { left: 40, right: 40 },
			})

			doc.save(`resource-analytics-report-${new Date().toISOString().slice(0, 10)}.pdf`)
		} finally {
			setIsDownloading(false)
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-2xl font-bold text-slate-900">Resource Analytics</h2>
					<p className="mt-1 text-sm text-slate-500">Track facility utilization, booking demand, and incident trends in one dashboard.</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={handleDownloadPdf}
						disabled={isLoading || isDownloading}
						className="rounded-full border border-indigo-300 bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isDownloading ? 'Preparing PDF...' : 'Download PDF'}
					</button>
					<button
						type="button"
						onClick={loadAnalytics}
						className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
					>
						Refresh
					</button>
					<button
						type="button"
						onClick={onBack}
						className="rounded-full border border-teal-300 bg-teal-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-teal-700 transition hover:border-teal-400 hover:bg-teal-100"
					>
						Back to Resources
					</button>
				</div>
			</div>

			{errorMessage && (
				<div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
					{errorMessage}
				</div>
			)}

			{isLoading ? (
				<div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
					Loading analytics...
				</div>
			) : (
				<>
					<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resources</p>
							<p className="mt-3 text-3xl font-bold text-slate-900">{resourceAnalytics.totalResources}</p>
							<p className="mt-2 text-xs text-slate-500">{resourceAnalytics.activeResources} active | {resourceAnalytics.outOfServiceResources} out of service</p>
						</article>

						<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Booking Load</p>
							<p className="mt-3 text-3xl font-bold text-slate-900">{bookingAnalytics.totalBookings}</p>
							<p className="mt-2 text-xs text-slate-500">{bookingAnalytics.pendingBookings} pending | {bookingAnalytics.approvedBookings} approved</p>
						</article>

						<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Incident Tickets</p>
							<p className="mt-3 text-3xl font-bold text-slate-900">{ticketAnalytics.totalTickets}</p>
							<p className="mt-2 text-xs text-slate-500">{ticketAnalytics.openTickets} currently open/in progress</p>
						</article>

						<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Capacity</p>
							<p className="mt-3 text-3xl font-bold text-slate-900">{resourceAnalytics.totalCapacity}</p>
							<p className="mt-2 text-xs text-slate-500">Average {resourceAnalytics.averageCapacity} seats per resource</p>
						</article>
					</section>

					<section className="grid gap-4 lg:grid-cols-3">
						<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 lg:col-span-1">
							<h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Resources By Type</h3>
							<div className="mt-4 space-y-3">
								{resourceAnalytics.byType.map((row) => (
									<div key={row.type}>
										<div className="flex items-center justify-between text-xs text-slate-600">
											<span>{formatEnumLabel(row.type)}</span>
											<span>{row.count}</span>
										</div>
										<div className="mt-1 h-2 rounded-full bg-slate-100">
											<div
												className="h-2 rounded-full bg-teal-500"
												style={{ width: `${percentage(row.count, maxTypeCount)}%` }}
											/>
										</div>
									</div>
								))}
							</div>
						</article>

						<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 lg:col-span-1">
							<h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Booking Status Mix</h3>
							<div className="mt-4 space-y-3">
								{bookingAnalytics.byStatus.map((row) => (
									<div key={row.status}>
										<div className="flex items-center justify-between text-xs text-slate-600">
											<span>{formatEnumLabel(row.status)}</span>
											<span>{row.count}</span>
										</div>
										<div className="mt-1 h-2 rounded-full bg-slate-100">
											<div
												className="h-2 rounded-full bg-amber-500"
												style={{ width: `${percentage(row.count, maxBookingStatusCount)}%` }}
											/>
										</div>
									</div>
								))}
							</div>
						</article>

						<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 lg:col-span-1">
							<h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Ticket Priorities</h3>
							<div className="mt-4 space-y-3">
								{ticketAnalytics.byPriority.map((row) => (
									<div key={row.priority}>
										<div className="flex items-center justify-between text-xs text-slate-600">
											<span>{formatEnumLabel(row.priority)}</span>
											<span>{row.count}</span>
										</div>
										<div className="mt-1 h-2 rounded-full bg-slate-100">
											<div
												className="h-2 rounded-full bg-rose-500"
												style={{ width: `${percentage(row.count, maxPriorityCount)}%` }}
											/>
										</div>
									</div>
								))}
							</div>
						</article>
					</section>

					<section className="grid gap-4 lg:grid-cols-2">
						<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
							<h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Ticket Status Overview</h3>
							<div className="mt-4 space-y-3">
								{ticketAnalytics.byStatus.map((row) => (
									<div key={row.status}>
										<div className="flex items-center justify-between text-xs text-slate-600">
											<span>{formatEnumLabel(row.status)}</span>
											<span>{row.count}</span>
										</div>
										<div className="mt-1 h-2 rounded-full bg-slate-100">
											<div
												className="h-2 rounded-full bg-indigo-500"
												style={{ width: `${percentage(row.count, maxTicketStatusCount)}%` }}
											/>
										</div>
									</div>
								))}
							</div>
						</article>

						<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
							<h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Top Booking Dates</h3>
							{!bookingAnalytics.busiestDates.length ? (
								<p className="mt-4 text-sm text-slate-500">No booking activity data available.</p>
							) : (
								<div className="mt-4 space-y-3">
									{bookingAnalytics.busiestDates.map((row) => (
										<div key={row.date} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
											<span className="font-medium text-slate-700">{row.date}</span>
											<span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
												{row.count} bookings
											</span>
										</div>
									))}
								</div>
							)}
						</article>
					</section>

					<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
						<h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Resource Health And Impact</h3>
						<p className="mt-1 text-xs text-slate-500">Combines booking demand and incident load per resource.</p>

						<div className="mt-4 overflow-x-auto">
							<table className="min-w-full divide-y divide-slate-200 text-sm">
								<thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
									<tr>
										<th className="px-3 py-2">Resource</th>
										<th className="px-3 py-2">Type</th>
										<th className="px-3 py-2">Status</th>
										<th className="px-3 py-2 text-right">Bookings</th>
										<th className="px-3 py-2 text-right">Tickets</th>
										<th className="px-3 py-2 text-right">Open Tickets</th>
										<th className="px-3 py-2 text-right">Health Score</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{resourceImpactRows.map((row) => (
										<tr key={row.resourceId}>
											<td className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
											<td className="px-3 py-2 text-slate-600">{formatEnumLabel(row.type)}</td>
											<td className="px-3 py-2 text-slate-600">{formatEnumLabel(row.status)}</td>
											<td className="px-3 py-2 text-right text-slate-700">{row.bookingCount}</td>
											<td className="px-3 py-2 text-right text-slate-700">{row.ticketCount}</td>
											<td className="px-3 py-2 text-right text-slate-700">{row.openTicketCount}</td>
											<td className="px-3 py-2 text-right font-semibold text-slate-900">{row.healthScore}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				</>
			)}
		</div>
	)
}
