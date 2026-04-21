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

function ResourceCard({ resource }) {
  const isActive = resource.status === 'ACTIVE'
  const imageUrl = getCardImageUrl(resource)

  const handleCardClick = () => {
    window.history.pushState(null, '', `/resources/${resource.id}`)
    window.dispatchEvent(new Event('popstate'))
  }

  return (
    <article 
      onClick={handleCardClick}
      className="cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md hover:border-teal-200 rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`${resource.name} cover`}
          className="h-44 w-full object-cover"
        />
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
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900">
            Browse rooms, labs, halls, and equipment before you book.
          </h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600">
            Compare locations, capacity, and availability at a glance to choose the right resource faster.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
              <FiltersPanel filters={filters} setFilters={setFilters} />
            </div>
          </aside>

          <div className="lg:col-span-3">
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
              <div className="grid gap-5 lg:grid-cols-2">
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
