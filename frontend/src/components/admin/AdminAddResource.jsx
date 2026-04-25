import { useState } from 'react'
import { createResource } from '../../api/api'
import { toast } from 'react-toastify'
import { hasFormErrors, validateAdminResourceForm } from './AdminResourceValidations'

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
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')

  const validateAndSetErrors = (nextFormState = formState, nextCoverImage = coverImage, nextExtraImages = extraImages) => {
    const errors = validateAdminResourceForm({
      formState: nextFormState,
      coverImage: nextCoverImage,
      extraImages: nextExtraImages,
    })

    const normalizedName = (nextFormState?.name || '').trim()
    if (!normalizedName) {
      errors.name = 'Resource name is required.'
    } else if (normalizedName.length > 20) {
      errors.name = 'Resource name must be maximum 20 characters.'
    } else {
      delete errors.name
    }

    setFieldErrors(errors)
    return errors
  }

  const updateFormState = (updater) => {
    setFormState((current) => {
      const nextState = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      if (hasTriedSubmit) {
        validateAndSetErrors(nextState, coverImage, extraImages)
      }
      return nextState
    })
  }

  const resetForm = () => {
    setFormState(initialFormState)
    setCoverImage(null)
    setExtraImages([])
    setIsEquipmentDialogOpen(false)
    setHasTriedSubmit(false)
    setFieldErrors({})
    setErrorMessage('')
  }

  const handleExtraImagesChange = (event) => {
    const files = Array.from(event.target.files || [])
    setExtraImages(files)
    if (hasTriedSubmit) {
      validateAndSetErrors(formState, coverImage, files)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setHasTriedSubmit(true)

    const validationErrors = validateAndSetErrors()
    if (hasFormErrors(validationErrors)) {
      setErrorMessage('Please fix the highlighted fields before submitting.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    const payload = {
      ...formState,
      capacity: formState.type === 'EQUIPMENT' ? 1 : Number(formState.capacity),
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
      toast.success('Resource created successfully.')
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

      

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-8 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Resource Name
          <input
            type="text"
            value={formState.name}
            onChange={(event) => updateFormState((current) => ({ ...current, name: event.target.value }))}
            maxLength={20}
            className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Engineering Lab A"
          />
          <span className="text-[11px] text-slate-500">{formState.name.length}/20 characters</span>
          {fieldErrors.name && <span className="text-xs text-rose-600">{fieldErrors.name}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Type
          <select
            value={formState.type}
            onChange={(event) => {
              const newType = event.target.value
              updateFormState((current) => ({
                ...current,
                type: newType,
                capacity: newType === 'EQUIPMENT' ? '1' : current.capacity,
                equipment: newType === 'EQUIPMENT' ? (current.equipment ?? initialFormState.equipment) : initialFormState.equipment,
              }))
              setIsEquipmentDialogOpen(newType === 'EQUIPMENT')
            }}
              className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {typeOptions.map((option) => (
              <option key={option} value={option}>{formatEnumLabel(option)}</option>
            ))}
          </select>
          {fieldErrors.type && <span className="text-xs text-rose-600">{fieldErrors.type}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Capacity
          <input
            // required
            min="1"
            type="number"
            value={formState.capacity}
            onChange={(event) => updateFormState((current) => ({ ...current, capacity: event.target.value }))}
            disabled={formState.type === 'EQUIPMENT'}
            className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          {fieldErrors.capacity && <span className="text-xs text-rose-600">{fieldErrors.capacity}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Location
          <input
            // required
            type="text"
            value={formState.location}
            onChange={(event) => updateFormState((current) => ({ ...current, location: event.target.value }))}
            className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Main Building, Floor 2"
          />
          {fieldErrors.location && <span className="text-xs text-rose-600">{fieldErrors.location}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Available From
          <input
            // required
            type="time"
            value={formState.availableFrom}
            min="08:00"
            max="20:00"
            onChange={(event) => updateFormState((current) => ({ ...current, availableFrom: event.target.value }))}
            className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          {fieldErrors.availableFrom && <span className="text-xs text-rose-600">{fieldErrors.availableFrom}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Available To
          <input
            // required
            type="time"
            value={formState.availableTo}
            min="08:00"
            max="20:00"
            onChange={(event) => updateFormState((current) => ({ ...current, availableTo: event.target.value }))}
            className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          {fieldErrors.availableTo && <span className="text-xs text-rose-600">{fieldErrors.availableTo}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Status
          <select
            value={formState.status}
            onChange={(event) => updateFormState((current) => ({ ...current, status: event.target.value }))}
            className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>{formatEnumLabel(option)}</option>
            ))}
          </select>
          {fieldErrors.status && <span className="text-xs text-rose-600">{fieldErrors.status}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea
            rows="3"
            value={formState.description}
            onChange={(event) => updateFormState((current) => ({ ...current, description: event.target.value }))}
            className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional details"
          />
          {fieldErrors.description && <span className="text-xs text-rose-600">{fieldErrors.description}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Cover Image
          <input
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={(event) => {
              const selectedCover = event.target.files?.[0] ?? null
              setCoverImage(selectedCover)
              if (hasTriedSubmit) {
                validateAndSetErrors(formState, selectedCover, extraImages)
              }
            }}
            className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          {fieldErrors.coverImage && <span className="text-xs text-rose-600">{fieldErrors.coverImage}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Additional Images (max 2)
          <input
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple
            onChange={handleExtraImagesChange}
            className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          {fieldErrors.extraImages && <span className="text-xs text-rose-600">{fieldErrors.extraImages}</span>}
          {!!extraImages.length && (
            <span className="text-xs text-slate-500">
              Selected: {extraImages.map((file) => file.name).join(', ')}
            </span>
          )}
        </label>

        {formState.type === 'EQUIPMENT' && (
          <div className="md:col-span-2 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">
                Equipment details are managed in a popup dialog.
              </p>
              <button
                type="button"
                onClick={() => setIsEquipmentDialogOpen(true)}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Open Equipment Details
              </button>
            </div>
          </div>
        )}

        <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Create Resource'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="w-full rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500 sm:w-auto"
          >
            Reset
          </button>
        </div>
      </form>

      {formState.type === 'EQUIPMENT' && isEquipmentDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Equipment Details</h3>
                <p className="text-xs text-slate-500">Update technical metadata for this equipment resource.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEquipmentDialogOpen(false)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6 lg:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Category
                <select
                  value={formState.equipment.category}
                  onChange={(e) => updateFormState((current) => ({ ...current, equipment: { ...current.equipment, category: e.target.value } }))}
                  className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                  onChange={(e) => updateFormState((current) => ({ ...current, equipment: { ...current.equipment, brand: e.target.value } }))}
                  className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Model
                <input
                  type="text"
                  value={formState.equipment.model}
                  onChange={(e) => updateFormState((current) => ({ ...current, equipment: { ...current.equipment, model: e.target.value } }))}
                  className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Serial #
                <input
                  type="text"
                  value={formState.equipment.serialNumber}
                  onChange={(e) => updateFormState((current) => ({ ...current, equipment: { ...current.equipment, serialNumber: e.target.value } }))}
                  className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Purchase Date
                <input
                  type="date"
                  value={formState.equipment.purchaseDate || ''}
                  onChange={(e) => updateFormState((current) => ({ ...current, equipment: { ...current.equipment, purchaseDate: e.target.value } }))}
                  className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
                Notes
                <textarea
                  rows="3"
                  value={formState.equipment.notes}
                  onChange={(e) => updateFormState((current) => ({ ...current, equipment: { ...current.equipment, notes: e.target.value } }))}
                  className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setIsEquipmentDialogOpen(false)}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
