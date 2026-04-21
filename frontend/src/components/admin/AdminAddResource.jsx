import { useState } from 'react'
import { createResource } from '../../api/api'

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

export default function AdminAddResource({ onCreated } = {}) {
  const [formState, setFormState] = useState(initialFormState)
  const [coverImage, setCoverImage] = useState(null)
  const [extraImages, setExtraImages] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pageMessage, setPageMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const resetForm = () => {
    setFormState(initialFormState)
    setCoverImage(null)
    setExtraImages([])
  }

  const handleExtraImagesChange = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 2) {
      setErrorMessage('You can upload up to 2 additional images.')
      setExtraImages(files.slice(0, 2))
      return
    }
    setExtraImages(files)
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
      await createResource(payload, {
        coverImage,
        images: extraImages,
      })
      setPageMessage('Resource created successfully.')
      try {
        window.dispatchEvent(new Event('unipilot-notification-refresh'))
      } catch (e) {
        // ignore
      }
      resetForm()
      if (typeof onCreated === 'function') onCreated()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the resource.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Add Resource</h2>
        <p className="mt-1 text-sm text-slate-500">Create a new facility or equipment entry.</p>
      </div>

      {pageMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {pageMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-2" onSubmit={handleSubmit}>
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
            rows="3"
            value={formState.description}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional details"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Cover Image
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setCoverImage(event.target.files?.[0] ?? null)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Additional Images (max 2)
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleExtraImagesChange}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          {!!extraImages.length && (
            <span className="text-xs text-slate-500">
              Selected: {extraImages.map((file) => file.name).join(', ')}
            </span>
          )}
        </label>

        {formState.type === 'EQUIPMENT' && (
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">Equipment Details</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
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
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Model
                <input
                  type="text"
                  value={formState.equipment.model}
                  onChange={(e) => setFormState((current) => ({ ...current, equipment: { ...current.equipment, model: e.target.value } }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Serial #
                <input
                  type="text"
                  value={formState.equipment.serialNumber}
                  onChange={(e) => setFormState((current) => ({ ...current, equipment: { ...current.equipment, serialNumber: e.target.value } }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                  rows="2"
                  value={formState.equipment.notes}
                  onChange={(e) => setFormState((current) => ({ ...current, equipment: { ...current.equipment, notes: e.target.value } }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
            Reset
          </button>
        </div>
      </form>
    </div>
  )
}
