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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('ALL')

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

  // Get unique resource types
  const resourceTypes = ['ALL', ...new Set(resources.map((r) => r.type))]

  // Filter resources based on search and type
  const filteredResources = resources.filter((resource) => {
    const matchesSearch = 
      resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = selectedType === 'ALL' || resource.type === selectedType
    
    return matchesSearch && matchesType
  })

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

      {/* Search and Filter Bar */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Search and filter</h3>
          <p className="mt-1 text-xs text-slate-500">Narrow down resources by name, location, or category.</p>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by resource name or location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10"
            />
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 cursor-pointer sm:min-w-[180px]"
          >
            {resourceTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'ALL' ? 'All Types' : formatEnumLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm font-semibold text-teal-700">
          Showing {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}
        </p>
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

      {!isLoading && !errorMessage && filteredResources.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No resources found.
        </div>
      )}

      {!isLoading && filteredResources.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => {
            const imageUrl = getCardImageUrl(resource)

            return (
            <article 
              key={resource.id} 
              onClick={() => handleCardClick(resource.id)}
              className="cursor-pointer overflow-hidden transition-all hover:shadow-lg rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 flex flex-col h-full"
            >
              {imageUrl && (
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img
                    src={imageUrl}
                    alt={`${resource.name} cover`}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
                    {formatEnumLabel(resource.type)}
                  </p>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    resource.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {formatEnumLabel(resource.status)}
                  </span>
                </div>

                <h3 className="mb-4 text-lg font-bold text-slate-900">{resource.name}</h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-slate-600">
                    <svg className="mr-2 h-4 w-4 shrink-0 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                    </svg>
                    <span className="text-slate-700">Available: {resource.availableFrom} - {resource.availableTo}</span>
                  </div>

                  <div className="flex items-center text-sm text-slate-600">
                    <svg className="mr-2 h-4 w-4 shrink-0 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <span className="text-slate-700">Capacity: {resource.capacity} people</span>
                  </div>

                  <div className="flex items-start text-sm text-slate-600">
                    <svg className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-9h11v2h-11z" />
                    </svg>
                    <span className="text-slate-700">{resource.location}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-slate-600">
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
