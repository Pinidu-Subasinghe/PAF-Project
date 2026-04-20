import { useEffect, useState } from 'react'
import { createResource, deleteResource, getResources, updateResource } from '../../api/api'
import { readAuthSession } from '../../utils/authSession'

const initialFormState = {
  name: '',
  type: 'LECTURE_HALL',
  capacity: '40',
  location: '',
  availableFrom: '08:00',
  availableTo: '17:00',
  status: 'ACTIVE',
  description: '',
}

const typeOptions = ['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT']
const statusOptions = ['ACTIVE', 'OUT_OF_SERVICE']

function formatEnumLabel(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function mapResourceToForm(resource) {
  return {
    name: resource.name ?? '',
    type: resource.type ?? 'LECTURE_HALL',
    capacity: `${resource.capacity ?? 1}`,
    location: resource.location ?? '',
    availableFrom: resource.availableFrom ?? '08:00',
    availableTo: resource.availableTo ?? '17:00',
    status: resource.status ?? 'ACTIVE',
    description: resource.description ?? '',
  }
}

export default function AdminResourcesPage() {
  const [session] = useState(() => readAuthSession())
  const [resources, setResources] = useState([])
  const [formState, setFormState] = useState(initialFormState)
  const [editingResourceId, setEditingResourceId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pageMessage, setPageMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const isAdmin = session?.role === 'ADMIN'

  const previewResource = {
    name: formState.name || 'Resource name',
    type: formState.type,
    capacity: Number(formState.capacity) || 1,
    location: formState.location || 'Location',
    availableFrom: formState.availableFrom || '08:00',
    availableTo: formState.availableTo || '17:00',
    status: formState.status,
    description: formState.description || 'No description added yet.',
  }

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

  const resetForm = () => {
    setFormState(initialFormState)
    setEditingResourceId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setPageMessage('')
    setErrorMessage('')

    const payload = {
      ...formState,
      capacity: Number(formState.capacity),
      description: formState.description.trim(),
    }

    try {
      if (editingResourceId) {
        await updateResource(editingResourceId, payload)
        setPageMessage('Resource updated successfully.')
      } else {
        await createResource(payload)
        setPageMessage('Resource created successfully.')
      }

      resetForm()
      await loadResources()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the resource.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (resource) => {
    setFormState(mapResourceToForm(resource))
    setEditingResourceId(resource.id)
    setPageMessage('')
    setErrorMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (resourceId) => {
    const confirmed = window.confirm('Delete this resource?')
    if (!confirmed) {
      return
    }

    setErrorMessage('')
    setPageMessage('')

    try {
      await deleteResource(resourceId)
      setPageMessage('Resource deleted successfully.')
      if (editingResourceId === resourceId) {
        resetForm()
      }
      await loadResources()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete the resource.')
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#cffafe_0,#f8fafc_36%,#ffffff_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-lg shadow-slate-900/5 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">Admin Resource Manager</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
                Create and maintain campus resources.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                This is your member-one admin page. New resources created here appear automatically on the
                public catalogue page at <span className="font-semibold text-slate-800">/resources</span>.
              </p>
            </div>
            <a
              href="/resources"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
            >
              Open User Catalogue
            </a>
          </div>

          {!isAdmin && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You are not signed in as an admin yet. The page is ready, but create, update, and delete calls will
              only work once your friend finishes admin authentication and your session role becomes <strong>ADMIN</strong>.
            </div>
          )}

          {pageMessage && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {pageMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {editingResourceId ? 'Update Resource' : 'Create New Resource'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Build the facility catalogue first. Booking and incident modules can then reference these resources.
                </p>
              </div>
              {editingResourceId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Resource Name
                <input
                  required
                  type="text"
                  value={formState.name}
                  onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Engineering Lab A"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Type
                <select
                  value={formState.type}
                  onChange={(event) => setFormState((current) => ({ ...current, type: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>{formatEnumLabel(option)}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Capacity
                <input
                  required
                  min="1"
                  type="number"
                  value={formState.capacity}
                  onChange={(event) => setFormState((current) => ({ ...current, capacity: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Location
                <input
                  required
                  type="text"
                  value={formState.location}
                  onChange={(event) => setFormState((current) => ({ ...current, location: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Main Building, Floor 2"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Available From
                <input
                  required
                  type="time"
                  value={formState.availableFrom}
                  onChange={(event) => setFormState((current) => ({ ...current, availableFrom: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Available To
                <input
                  required
                  type="time"
                  value={formState.availableTo}
                  onChange={(event) => setFormState((current) => ({ ...current, availableTo: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Status
                <select
                  value={formState.status}
                  onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>{formatEnumLabel(option)}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Description
                <textarea
                  rows="4"
                  value={formState.description}
                  onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Special notes, equipment included, or usage limitations"
                />
              </label>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingResourceId
                      ? 'Update Resource'
                      : 'Create Resource'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
                >
                  Reset Form
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
            <h3 className="text-xl font-semibold text-slate-900">Live Preview</h3>
            <article className="mt-3 rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{formatEnumLabel(previewResource.type)}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{previewResource.name || 'Resource name'}</h3>
                  <p className="mt-1 text-sm text-slate-500">{previewResource.location} • Capacity {previewResource.capacity}</p>
                  <p className="mt-2 text-xs text-slate-500">Available {previewResource.availableFrom} to {previewResource.availableTo}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${previewResource.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {formatEnumLabel(previewResource.status)}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-600">{previewResource.description}</p>
            </article>
          </section>

          <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">All Resources</h2>
                <p className="mt-1 text-sm text-slate-500">Review and manage catalogue entries. New resources appear here.</p>
              </div>
              <div className="flex items-center gap-3">
                <a href="/resources" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900">Open User Catalogue</a>
                <a href="/admin/all-resources" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">All Resources</a>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{resources.length} items</span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {isLoading && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Loading resources...
                </div>
              )}

              {!isLoading && resources.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No resources yet. Create the first one with the form.
                </div>
              )}

              {!isLoading && resources.map((resource) => (
                <article key={resource.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                        {formatEnumLabel(resource.type)}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">{resource.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {resource.location} • Capacity {resource.capacity}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Available {resource.availableFrom} to {resource.availableTo}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      resource.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {formatEnumLabel(resource.status)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    {resource.description || 'No description added yet.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(resource)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(resource.id)}
                      className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
