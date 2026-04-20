import { useState } from 'react'
import { createResource } from '../../api/api'
import { readAuthSession } from '../../utils/authSession'

const initialFormState = {
  name: '',
  type: 'LECTURE_HALL',
  capacity: '',
  location: '',
  availableFrom: '08:00',
  availableTo: '17:00',
  status: 'ACTIVE',
  description: '',
  equipment: {
    category: 'PROJECTOR',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    notes: '',
  },
}

const typeOptions = ['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT']
const statusOptions = ['ACTIVE', 'OUT_OF_SERVICE']
const equipmentCategoryOptions = ['PROJECTOR', 'SMART_BOARD', 'SPEAKER', 'MICROPHONE', 'CAMERA', 'OTHER']
function formatEnumLabel(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// Removed unused mapResourceToForm to keep this component focused on resource creation

export default function AdminResourcesPage() {
  const [session] = useState(() => readAuthSession())
  const [formState, setFormState] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pageMessage, setPageMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const isAdmin = session?.role === 'ADMIN'

  const resetForm = () => {
    setFormState(initialFormState)
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

    // include equipment only for equipment resources
    if (formState.type === 'EQUIPMENT') {
      payload.equipment = {
        category: formState.equipment?.category || initialFormState.equipment.category,
        brand: formState.equipment?.brand?.trim() || null,
        model: formState.equipment?.model?.trim() || null,
        serialNumber: formState.equipment?.serialNumber?.trim() || null,
        purchaseDate: formState.equipment?.purchaseDate || null,
        notes: formState.equipment?.notes?.trim() || null,
      }
    } else {
      delete payload.equipment
    }

    try {
      await createResource(payload)
      setPageMessage('Resource created successfully.')
      resetForm()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the resource.')
    } finally {
      setIsSubmitting(false)
    }
  }

  

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#cffafe_0,#f8fafc_36%,#ffffff_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        

        {!isAdmin && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You are not signed in as an admin yet. Create calls will only work once your session role becomes <strong>ADMIN</strong>.
          </div>
        )}

        {pageMessage && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {pageMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Create New Resource</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Build the facility catalogue first. Booking and incident modules can then reference these resources.
                </p>
              </div>
              <a
                href="/resources"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
              >
                View Catalogue
              </a>
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
                  onChange={(event) => {
                    const newType = event.target.value
                    setFormState((current) => ({
                      ...current,
                      type: newType,
                      equipment: newType === 'EQUIPMENT' ? (current.equipment ?? initialFormState.equipment) : initialFormState.equipment,
                    }))
                  }}
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

              {formState.type === 'EQUIPMENT' && (
                <div className="md:col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <h3 className="text-lg font-semibold text-slate-900">Equipment Details</h3>
                  <p className="mt-1 text-sm text-slate-500">Provide metadata for equipment (brand, model, serial, purchase date).</p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Category
                      <select
                        value={formState.equipment.category}
                        onChange={(e) => setFormState((current) => ({ ...current, equipment: { ...current.equipment, category: e.target.value } }))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      >
                        {equipmentCategoryOptions.map((opt) => (
                          <option key={opt} value={opt}>{formatEnumLabel(opt)}</option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Brand
                      <input
                        type="text"
                        value={formState.equipment.brand}
                        onChange={(e) => setFormState((current) => ({ ...current, equipment: { ...current.equipment, brand: e.target.value } }))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="e.g., Epson"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Model
                      <input
                        type="text"
                        value={formState.equipment.model}
                        onChange={(e) => setFormState((current) => ({ ...current, equipment: { ...current.equipment, model: e.target.value } }))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="e.g., EB-X41"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Serial #
                      <input
                        type="text"
                        value={formState.equipment.serialNumber}
                        onChange={(e) => setFormState((current) => ({ ...current, equipment: { ...current.equipment, serialNumber: e.target.value } }))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Optional"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Purchase Date
                      <input
                        type="date"
                        value={formState.equipment.purchaseDate || ''}
                        onChange={(e) => setFormState((current) => ({ ...current, equipment: { ...current.equipment, purchaseDate: e.target.value } }))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                      Notes
                      <textarea
                        rows="3"
                        value={formState.equipment.notes}
                        onChange={(e) => setFormState((current) => ({ ...current, equipment: { ...current.equipment, notes: e.target.value } }))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Optional notes about this equipment"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Create Resource'}
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
        </div>
      </div>
    </main>
  )
}
