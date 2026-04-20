import { useEffect, useState } from 'react'
import { getResources } from '../api/api'
import { readAuthSession } from '../utils/authSession'

export default function AllResourcesPage() {
  const [session] = useState(() => readAuthSession())
  const [resources, setResources] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const isAdmin = session?.role === 'ADMIN'

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#cffafe_0,#f8fafc_36%,#ffffff_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">All Resources</h1>
            <p className="mt-1 text-sm text-slate-500">Full catalogue view — review and manage entries.</p>
          </div>
          <a href="/admin/resources" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900">Back to Manager</a>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading resources...</div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{errorMessage}</div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {!isLoading && resources.map((resource) => (
            <article key={resource.id} className="rounded-2xl border border-slate-200 p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{(resource.type || '').toLowerCase().split('_').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(' ')}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{resource.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{resource.location} • Capacity {resource.capacity}</p>
                  <p className="mt-2 text-xs text-slate-500">Available {resource.availableFrom} to {resource.availableTo}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${(resource.status === 'ACTIVE') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {(resource.status || '').toLowerCase().split('_').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(' ')}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-600">{resource.description || 'No description added yet.'}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
