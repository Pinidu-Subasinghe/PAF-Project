import { useEffect, useState } from 'react'
import { getResources } from '../../api/api'

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

export default function AdminResourceManagement({ onSelectResource, onViewAnalytics } = {}) {
  const [resources, setResources] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadResources = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await getResources()
      setResources(Array.isArray(response) ? response : [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load resources.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResources()
  }, [])

  const handleCardClick = (resourceId) => {
    if (typeof onSelectResource === 'function') {
      onSelectResource(resourceId)
      return
    }

    window.history.pushState(null, '', `/resources/${resourceId}`)
    window.dispatchEvent(new Event('popstate'))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manage Resources</h2>
          <p className="mt-1 text-sm text-slate-500">Review, update, and monitor all campus facilities and equipment in one place.</p>
        </div>
        <button
          type="button"
          onClick={onViewAnalytics}
          className="rounded-full border border-teal-300 bg-teal-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-teal-700 transition hover:border-teal-400 hover:bg-teal-100"
        >
          View Analytics
        </button>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
          Loading resources...
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && resources.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No resources found.
        </div>
      )}

      {!isLoading && resources.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const imageUrl = getCardImageUrl(resource)

            return (
            <article 
              key={resource.id} 
              onClick={() => handleCardClick(resource.id)}
              className="cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md hover:border-teal-200 rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 flex flex-col h-full"
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={`${resource.name} cover`}
                  className="h-40 w-full object-cover"
                />
              )}

              <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                    {formatEnumLabel(resource.type)}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 line-clamp-1">{resource.name}</h3>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  resource.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {formatEnumLabel(resource.status)}
                </span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <svg className="mr-1.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span className="truncate">{resource.location}</span>
                </div>
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <svg className="mr-1.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  Capacity: {resource.capacity} people
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <svg className="mr-1.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Available: {resource.availableFrom} - {resource.availableTo}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-2">
                  {resource.description?.trim() || 'Resource details are being maintained by the administration team.'}
                </p>
              </div>
              </div>
            </article>
          )})}
        </div>
      )}
    </div>
  )
}
