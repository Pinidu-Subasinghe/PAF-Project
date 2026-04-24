import { useEffect, useMemo, useState } from 'react'
import { deleteResource, getResourceById, updateResource } from '../../api/api'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { hasFormErrors, validateAdminResourceForm } from './AdminResourceValidations'

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

function buildFormState(resource) {
  return {
    name: resource.name ?? '',
    type: resource.type ?? 'LECTURE_HALL',
    capacity: resource.type === 'EQUIPMENT' ? '1' : (resource.capacity ?? ''),
    location: resource.location ?? '',
    availableFrom: resource.availableFrom ?? '08:00',
    availableTo: resource.availableTo ?? '17:00',
    status: resource.status ?? 'ACTIVE',
    description: resource.description ?? '',
    equipment: {
      category: resource.equipment?.category ?? 'PROJECTOR',
      brand: resource.equipment?.brand ?? '',
      model: resource.equipment?.model ?? '',
      serialNumber: resource.equipment?.serialNumber ?? '',
      purchaseDate: resource.equipment?.purchaseDate ?? '',
      notes: resource.equipment?.notes ?? '',
    },
  }
}

export default function AdminResourceInfoCard({ resourceId, onBack, onDeleted } = {}) {
  const [resource, setResource] = useState(null)
  const [formState, setFormState] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [pageMessage, setPageMessage] = useState('')
  const [coverImage, setCoverImage] = useState(null)
  const [newAdditionalImages, setNewAdditionalImages] = useState([])
  const [removedImageIds, setRemovedImageIds] = useState([])

  const loadResource = async () => {
    if (!resourceId) return

    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await getResourceById(resourceId)
      setResource(response)
      setFormState(buildFormState(response))
      setRemovedImageIds([])
      setCoverImage(null)
      setNewAdditionalImages([])
      setHasTriedSubmit(false)
      setFieldErrors({})
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load resource details.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResource()
  }, [resourceId])

  const visibleImages = useMemo(() => {
    const base = Array.isArray(resource?.images) ? resource.images : []
    return base.filter((img) => img?.publicId && !removedImageIds.includes(img.publicId))
  }, [resource, removedImageIds])

  const visibleCover = visibleImages.find((img) => img.cover)
  const visibleAdditional = visibleImages.filter((img) => !img.cover)

  const validateAndSetErrors = (
    nextFormState = formState,
    nextCoverImage = coverImage,
    nextNewAdditionalImages = newAdditionalImages,
    nextVisibleAdditionalCount = visibleAdditional.length,
  ) => {
    const errors = validateAdminResourceForm({
      formState: nextFormState,
      coverImage: nextCoverImage,
      extraImages: nextNewAdditionalImages,
      existingAdditionalImageCount: nextVisibleAdditionalCount,
    })
    setFieldErrors(errors)
    return errors
  }

  const updateFormState = (updater) => {
    setFormState((current) => {
      const nextState = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      if (hasTriedSubmit) {
        validateAndSetErrors(nextState, coverImage, newAdditionalImages)
      }
      return nextState
    })
  }

  const toggleRemoveImage = (publicId) => {
    setRemovedImageIds((current) =>
      {
        const nextIds = current.includes(publicId)
          ? current.filter((id) => id !== publicId)
          : [...current, publicId]

        if (hasTriedSubmit) {
          const nextVisibleAdditionalCount = (Array.isArray(resource?.images) ? resource.images : [])
            .filter((img) => img?.publicId && !img.cover && !nextIds.includes(img.publicId)).length
          validateAndSetErrors(formState, coverImage, newAdditionalImages, nextVisibleAdditionalCount)
        }

        return nextIds
      }
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!resourceId || !formState) return

    setHasTriedSubmit(true)
    const validationErrors = validateAndSetErrors()
    if (hasFormErrors(validationErrors)) {
      setErrorMessage('Please fix the highlighted fields before submitting.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setPageMessage('')

    const payload = {
      ...formState,
      capacity: formState.type === 'EQUIPMENT' ? 1 : Number(formState.capacity),
      description: formState.description?.trim() || '',
    }

    if (formState.type === 'EQUIPMENT') {
      payload.equipment = {
        category: formState.equipment?.category || 'PROJECTOR',
        brand: formState.equipment?.brand?.trim() || null,
        model: formState.equipment?.model?.trim() || null,
        serialNumber: formState.equipment?.serialNumber?.trim() || null,
        purchaseDate: formState.equipment?.purchaseDate || null,
        notes: formState.equipment?.notes?.trim() || null,
      }
    } else {
      delete payload.equipment
    }

    const keepImagePublicIds = visibleImages.map((img) => img.publicId)

    try {
      await updateResource(resourceId, payload, {
        coverImage,
        images: newAdditionalImages,
        keepImagePublicIds,
      })
      setPageMessage('Resource updated successfully.')
      toast.success('Resource updated successfully.')
      await loadResource()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the resource.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!resourceId) return

    const result = await Swal.fire({
      title: 'Delete this resource?',
      text: 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    setIsSubmitting(true)
    setErrorMessage('')
    setPageMessage('')

    try {
      await deleteResource(resourceId)
      toast.success('Resource deleted successfully.')
      if (typeof onDeleted === 'function') onDeleted()
      if (typeof onBack === 'function') onBack()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete the resource.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!resourceId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-600">
        Select a resource to manage.
      </div>
    )
  }

  if (isLoading || !formState) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
        Loading resource info...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Resource Info</h2>
          <p className="mt-1 text-sm text-slate-500">Update or delete this resource.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:border-slate-500"
        >
          Back to list
        </button>
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Existing Images</h3>

        {!visibleImages.length && (
          <p className="mt-3 text-sm text-slate-500">No existing images.</p>
        )}

        {!!visibleImages.length && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleImages.map((img) => (
              <div key={img.publicId} className="relative overflow-hidden rounded-xl border border-slate-200">
                <img src={img.url} alt="Resource" className="h-32 w-full object-cover" />
                <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                  {img.cover ? 'Cover' : 'Additional'}
                </div>
                <button
                  type="button"
                  onClick={() => toggleRemoveImage(img.publicId)}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white shadow hover:bg-rose-700"
                  aria-label="Remove image"
                  title="Remove image"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Resource Name
          <input
            required
            type="text"
            value={formState.name}
            onChange={(event) => updateFormState((current) => ({ ...current, name: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
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
                equipment: newType === 'EQUIPMENT' ? current.equipment : {
                  category: 'PROJECTOR',
                  brand: '',
                  model: '',
                  serialNumber: '',
                  purchaseDate: '',
                  notes: '',
                },
              }))
            }}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
            required
            min="1"
            type="number"
            value={formState.capacity}
            onChange={(event) => updateFormState((current) => ({ ...current, capacity: event.target.value }))}
            disabled={formState.type === 'EQUIPMENT'}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          {fieldErrors.capacity && <span className="text-xs text-rose-600">{fieldErrors.capacity}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Location
          <input
            required
            type="text"
            value={formState.location}
            onChange={(event) => updateFormState((current) => ({ ...current, location: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          {fieldErrors.location && <span className="text-xs text-rose-600">{fieldErrors.location}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Available From
          <input
            required
            type="time"
            value={formState.availableFrom}
            min="08:00"
            max="20:00"
            onChange={(event) => updateFormState((current) => ({ ...current, availableFrom: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          {fieldErrors.availableFrom && <span className="text-xs text-rose-600">{fieldErrors.availableFrom}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Available To
          <input
            required
            type="time"
            value={formState.availableTo}
            min="08:00"
            max="20:00"
            onChange={(event) => updateFormState((current) => ({ ...current, availableTo: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          {fieldErrors.availableTo && <span className="text-xs text-rose-600">{fieldErrors.availableTo}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Status
          <select
            value={formState.status}
            onChange={(event) => updateFormState((current) => ({ ...current, status: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>{formatEnumLabel(option)}</option>
            ))}
          </select>
          {fieldErrors.status && <span className="text-xs text-rose-600">{fieldErrors.status}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Cover Image (replace)
          <input
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={(event) => {
              const selectedCover = event.target.files?.[0] ?? null
              setCoverImage(selectedCover)
              if (hasTriedSubmit) {
                validateAndSetErrors(formState, selectedCover, newAdditionalImages)
              }
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          {fieldErrors.coverImage && <span className="text-xs text-rose-600">{fieldErrors.coverImage}</span>}
          {!!visibleCover && !coverImage && (
            <span className="text-xs text-slate-500">Current cover will stay unless removed using X above.</span>
          )}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Additional Images (add)
          <input
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files || [])
              setNewAdditionalImages(files)
              if (hasTriedSubmit) {
                validateAndSetErrors(formState, coverImage, files)
              }
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          {fieldErrors.extraImages && <span className="text-xs text-rose-600">{fieldErrors.extraImages}</span>}
          {!!newAdditionalImages.length && (
            <span className="text-xs text-slate-500">
              New files: {newAdditionalImages.map((f) => f.name).join(', ')}
            </span>
          )}
          <span className="text-xs text-slate-500">Maximum 2 additional images in total after update.</span>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea
            rows="3"
            value={formState.description}
            onChange={(event) => updateFormState((current) => ({ ...current, description: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          {fieldErrors.description && <span className="text-xs text-rose-600">{fieldErrors.description}</span>}
        </label>

        {formState.type === 'EQUIPMENT' && (
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Equipment Details</h3>
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
            {isSubmitting ? 'Saving...' : 'Update Resource'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="rounded-full border border-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete Resource
          </button>
        </div>
      </form>
    </div>
  )
}
