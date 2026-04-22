import { useEffect, useState } from 'react'
import { getResourceById } from '../api/api'
import { readAuthSession, authSessionChangeEvent } from '../utils/authSession'

function formatEnumLabel(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function ResourceDetailsCard() {
  const [resource, setResource] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [session, setSession] = useState(() => readAuthSession())

  useEffect(() => {
    // Extract ID from pathname (e.g., "/resources/123")
    const match = window.location.pathname.match(/^\/resources\/(\d+)$/)
    const resourceId = match ? match[1] : null

    const syncSession = () => setSession(readAuthSession())

    window.addEventListener('storage', syncSession)
    window.addEventListener(authSessionChangeEvent, syncSession)


    if (!resourceId) {
      setErrorMessage('Invalid resource ID.')
      setIsLoading(false)
      return
    }

    let isCurrent = true

    const loadResource = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await getResourceById(resourceId)
        if (isCurrent) {
          setResource(response)
          setActiveImageIndex(0)
        }
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load resource details right now.')
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadResource()

    return () => {
      isCurrent = false
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(authSessionChangeEvent, syncSession)
    }
  }, [])

  const handleBack = () => {
    window.history.pushState(null, '', '/resources')
    window.dispatchEvent(new Event('popstate'))
  }

  const handleBookNow = () => {
    window.history.pushState(null, '', `/bookings/create/${resource.id}`)
    window.dispatchEvent(new Event('popstate'))
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-teal-900/5 flex items-center justify-center min-h-[400px]">
          <p className="text-slate-500">Loading resource details...</p>
        </div>
      </div>
    )
  }

  if (errorMessage || !resource) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8 shadow-lg shadow-rose-900/5 flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-rose-700 font-medium mb-4">{errorMessage || 'Resource not found.'}</p>
          <button 
            onClick={handleBack}
            className="text-sm font-semibold text-rose-700 hover:text-rose-800 underline"
          >
            &larr; Back to Resources
          </button>
        </div>
      </div>
    )
  }

  const isActive = resource.status === 'ACTIVE'
  const images = Array.isArray(resource.images)
    ? resource.images.filter((image) => image && image.url)
    : []

  const handlePrevImage = () => {
    setActiveImageIndex((current) => (current - 1 + images.length) % images.length)
  }

  const handleNextImage = () => {
    setActiveImageIndex((current) => (current + 1) % images.length)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <button 
        onClick={handleBack}
        className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <span className="mr-2 text-lg leading-none">&larr;</span> Back to all resources
      </button>

      <article className="rounded-[2rem] border border-teal-100 bg-white p-8 shadow-xl shadow-teal-900/5 md:p-12">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-100 pb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
              {formatEnumLabel(resource.type)}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {resource.name}
            </h1>
          </div>
          <span className={`inline-flex self-start rounded-full px-4 py-1.5 text-sm font-semibold ${
            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {formatEnumLabel(resource.status)}
          </span>
        </div>

        {images.length > 0 && (
          <div className="mt-8 border-b border-slate-100 pb-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <img
                src={images[activeImageIndex].url}
                alt={`${resource.name} image ${activeImageIndex + 1}`}
                className="h-80 w-full object-cover sm:h-96"
              />
              {images.length > 1 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4">
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white"
                    aria-label="Previous image"
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white"
                    aria-label="Next image"
                  >
                    &gt;
                  </button>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 text-center text-xs font-medium text-slate-500">
                {activeImageIndex + 1} / {images.length}
              </div>
            )}
          </div>
        )}

        <div className="py-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Location</h3>
            <p className="text-slate-800 font-medium text-lg">{resource.location}</p>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Capacity</h3>
            <p className="text-slate-800 font-medium text-lg">{resource.capacity}</p>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Availability</h3>
            <p className="text-slate-800 font-medium text-lg">
              {resource.availableFrom} &mdash; {resource.availableTo}
            </p>
          </div>
        </div>

        {resource.description && (
          <div className="py-8 border-b border-slate-100">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-4">Description</h3>
            <p className="text-slate-700 leading-relaxed max-w-3xl">
              {resource.description}
            </p>
          </div>
        )}

        {resource.equipment && (
          <div className="py-8 border-b border-slate-100 bg-slate-50/50 rounded-2xl p-6 mt-8">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-6 flex items-center">
              <span className="w-8 h-[1px] bg-slate-200 mr-3"></span>
              Equipment Specifications
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {resource.equipment.category && (
                <div>
                  <dt className="text-xs text-slate-500 mb-1">Category</dt>
                  <dd className="font-medium text-slate-800">{formatEnumLabel(resource.equipment.category)}</dd>
                </div>
              )}
              {resource.equipment.brand && (
                <div>
                  <dt className="text-xs text-slate-500 mb-1">Brand</dt>
                  <dd className="font-medium text-slate-800">{resource.equipment.brand}</dd>
                </div>
              )}
              {resource.equipment.model && (
                <div>
                  <dt className="text-xs text-slate-500 mb-1">Model</dt>
                  <dd className="font-medium text-slate-800">{resource.equipment.model}</dd>
                </div>
              )}
              {resource.equipment.serialNumber && (
                <div>
                  <dt className="text-xs text-slate-500 mb-1">Serial Number</dt>
                  <dd className="font-medium text-slate-800">{resource.equipment.serialNumber}</dd>
                </div>
              )}
              {resource.equipment.purchaseDate && (
                <div>
                  <dt className="text-xs text-slate-500 mb-1">Purchase Date</dt>
                  <dd className="font-medium text-slate-800">{new Date(resource.equipment.purchaseDate).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
            {resource.equipment.notes && (
              <div className="mt-6 pt-6 border-t border-slate-200/60">
                <dt className="text-xs text-slate-500 mb-2">Technical Notes</dt>
                <dd className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-100">
                  {resource.equipment.notes}
                </dd>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 flex justify-end">
          {session && session.role === 'ADMIN' ? null : (
            session && session.role === 'USER' ? (
              <button 
                type="button"
                onClick={handleBookNow}
                className="inline-flex items-center justify-center rounded-full bg-teal-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md shadow-teal-500/20 transition-all hover:bg-teal-700 hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-50 disabled:pointer-events-none"
                disabled={!isActive}
              >
                {isActive ? 'Book Now' : 'Currently Unavailable'}
              </button>
            ) : (
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
              >
                Sign in to book
              </a>
            )
          )}
        </div>
      </article>
    </div>
  )
}
