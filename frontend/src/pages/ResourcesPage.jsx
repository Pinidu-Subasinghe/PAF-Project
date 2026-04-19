import { useEffect, useMemo, useState } from 'react'
import { getResources } from '../api/api'

const typeOptions = [
  { value: '', label: 'All types' },
  { value: 'LECTURE_HALL', label: 'Lecture Hall' },
  { value: 'LAB', label: 'Lab' },
  { value: 'MEETING_ROOM', label: 'Meeting Room' },
  { value: 'EQUIPMENT', label: 'Equipment' },
]

const statusOptions = [
  { value: '', label: 'Any status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OUT_OF_SERVICE', label: 'Out of service' },
]

function formatEnumLabel(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function ResourceCard({ resource }) {
  const isActive = resource.status === 'ACTIVE'

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
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
            {resource.availableFrom} to {resource.availableTo}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Description</dt>
          <dd className="mt-1 text-slate-700">{resource.description || 'No description added yet.'}</dd>
        </div>
      </dl>
    </article>
  )
}

export default function ResourcesPage() {
  const [filters, setFilters] = useState({
    type: '',
    minCapacity: '',
    location: '',
    status: '',
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
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            This page is your member-one user view. Every resource created on the admin side appears here
            automatically because both screens use the same backend catalogue API.
          </p>
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Type
              <select
                value={filters.type}
                onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {typeOptions.map((option) => (
                  <option key={option.label} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Minimum Capacity
              <input
                type="number"
                min="1"
                value={filters.minCapacity}
                onChange={(event) => setFilters((current) => ({ ...current, minCapacity: event.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. 50"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Location
              <input
                type="text"
                value={filters.location}
                onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Search building or block"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Status
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option.label} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="mt-8">
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
        </section>
      </div>
    </main>
  )
}
