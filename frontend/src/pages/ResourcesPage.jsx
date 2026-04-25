import { useEffect, useMemo, useState } from 'react'
import { getResources } from '../api/api'
import FiltersPanel from '../components/FiltersPanel'

function formatEnumLabel(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getCardImageUrl(resource) {
  const images = Array.isArray(resource?.images) ? resource.images : []
  const coverImage = images.find((img) => img?.cover && img?.url)

  if (coverImage?.url) return coverImage.url
  if (images[0]?.url) return images[0].url
  if (resource?.coverImageUrl) return resource.coverImageUrl
  if (resource?.imageUrl) return resource.imageUrl

  return ''
}

function getMonthlyUsageInsight(resource) {
  const numericCandidates = [
    resource?.monthlyUsageCount,
    resource?.usageCountThisMonth,
    resource?.bookingsThisMonth,
    resource?.totalBookingsThisMonth,
    resource?.monthlyBookings,
    resource?.usageCount,
  ]

  const actualUsage = numericCandidates
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value >= 0)

  if (typeof actualUsage === 'number') {
    return {
      usageCount: Math.round(actualUsage),
      usageSource: 'actual',
    }
  }

  // Fallback estimate keeps the reminder feature useful when explicit usage metrics are not available yet.
  const typeBase = {
    LECTURE_HALL: 40,
    LAB: 34,
    MEETING_ROOM: 24,
    EQUIPMENT: 46,
  }

  const base = typeBase[resource?.type] ?? 30
  const capacityFactor = Math.min(Number(resource?.capacity) || 0, 120) * 0.22
  const estimated = Math.round(base + capacityFactor)

  return {
    usageCount: estimated,
    usageSource: 'estimated',
  }
}

function ResourceCard({ resource }) {
  const isActive = resource.status === 'ACTIVE'
  const imageUrl = getCardImageUrl(resource)
  const { usageCount, usageSource } = getMonthlyUsageInsight(resource)
  const serviceRecommended = resource.type === 'EQUIPMENT' && usageCount >= 50

  const handleCardClick = () => {
    window.history.pushState(null, '', `/resources/${resource.id}`)
    window.dispatchEvent(new Event('popstate'))
  }

  return (
    <article
      onClick={handleCardClick}
      className="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-900/10"
    >
      {imageUrl && (
        <div className="relative overflow-hidden">
          <img
            src={imageUrl}
            alt={`${resource.name} cover`}
            className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent" />
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
              {formatEnumLabel(resource.type)}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{resource.name}</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {formatEnumLabel(resource.status)}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Location</dt>
            <dd className="mt-1 font-medium text-slate-800">{resource.location}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Capacity</dt>
            <dd className="mt-1 font-medium text-slate-800">{resource.capacity}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Available</dt>
            <dd className="mt-1 font-medium text-slate-800">
              {resource.availableFrom} - {resource.availableTo}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Overview</dt>
            <dd className="mt-1 text-slate-700 line-clamp-2">
              {resource.description?.trim() || 'This resource is ready for campus use and can be booked during available hours.'}
            </dd>
          </div>
        </dl>

        {serviceRecommended && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {usageSource === 'actual' ? `${usageCount} uses this month` : `Estimated ${usageCount} uses this month`}
            {' -> Service recommended'}
          </div>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              handleCardClick()
            }}
            className="w-full rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-105 hover:shadow-xl hover:shadow-violet-500/40"
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  )
}

export default function ResourcesPage() {
  const [filters, setFilters] = useState({
    type: '',
    minCapacity: '',
    location: '',
    status: '',
    equipmentCategory: '',
  })
  const [resources, setResources] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const maintenanceInsights = useMemo(() => {
    return resources
      .filter((resource) => resource.type === 'EQUIPMENT')
      .map((resource) => ({ resource, ...getMonthlyUsageInsight(resource) }))
  }, [resources])

  const maintenanceAlerts = useMemo(
    () => maintenanceInsights.filter((item) => item.usageCount >= 1),
    [maintenanceInsights],
  )

  const appliedFilters = useMemo(() => ({
    ...filters,
    minCapacity: filters.minCapacity ? Number(filters.minCapacity) : '',
  }), [filters])

  useEffect(() => {
    let isCurrent = true

    const loadResources = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await getResources(appliedFilters)
        if (isCurrent) {
          setResources(Array.isArray(response) ? response : [])
        }
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load resources right now.')
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadResources()

    return () => {
      isCurrent = false
    }
  }, [appliedFilters])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f3fbfb_0%,#f8fafc_40%,#ffffff_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-teal-100 bg-white/80 p-8 shadow-lg shadow-teal-900/5 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">Facilities Catalogue</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2rem] lg:text-[2.35rem]">
            Browse facilities before booking.
          </h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600">
            Compare locations, capacity, and availability at a glance to choose the right resource faster.
          </p>
        </section>

        <section className="mt-8 space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
            <FiltersPanel filters={filters} setFilters={setFilters} />
          </div>

          <div>
            {!isLoading && !errorMessage && maintenanceAlerts.length > 0 && (
              <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm shadow-amber-900/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-amber-900">Auto Maintenance Reminder</h2>
                    <p className="mt-1 text-sm text-amber-800">
                      High-usage equipment is flagged for preventive maintenance checks.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                    {maintenanceAlerts.length} recommendation{maintenanceAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {maintenanceAlerts.slice(0, 6).map(({ resource, usageCount, usageSource }) => (
                    <div key={resource.id} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900">{resource.name}</p>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                          Service Recommended
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {usageSource === 'actual' ? `${usageCount} uses this month` : `Estimated ${usageCount} uses this month`}
                        {' -> Service recommended'}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {isLoading && (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
                Loading resources...
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}

            {!isLoading && !errorMessage && resources.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
                No resources match the current filters.
              </div>
            )}

            {!isLoading && !errorMessage && resources.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {resources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
