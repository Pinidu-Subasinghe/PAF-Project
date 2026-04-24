export const RESOURCE_NAME_MIN_LENGTH = 10
export const RESOURCE_NAME_MAX_LENGTH = 35
export const RESOURCE_DESCRIPTION_MAX_LENGTH = 100
export const RESOURCE_MIN_TIME = '08:00'
export const RESOURCE_MAX_TIME = '20:00'
export const RESOURCE_ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png']

const RESOURCE_ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png']

function hasValue(value) {
	return String(value ?? '').trim().length > 0
}

function getTimeInMinutes(value) {
	if (!value || typeof value !== 'string' || !value.includes(':')) return null

	const [hoursPart, minutesPart] = value.split(':')
	const hours = Number(hoursPart)
	const minutes = Number(minutesPart)

	if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
	return hours * 60 + minutes
}

function isSupportedImageFile(file) {
	if (!file) return true
	if (file.url || file.publicId) return true

	if (RESOURCE_ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) return true

	const extension = file.name?.split('.').pop()?.toLowerCase() || ''
	return RESOURCE_ALLOWED_IMAGE_EXTENSIONS.includes(extension)
}

function validateRequiredFields(formState, errors) {
	if (!hasValue(formState.name)) errors.name = 'Resource name is required.'
	if (!hasValue(formState.type)) errors.type = 'Type is required.'
	if (!hasValue(formState.capacity)) errors.capacity = 'Capacity is required.'
	if (!hasValue(formState.location)) errors.location = 'Location is required.'
	if (!hasValue(formState.availableFrom)) errors.availableFrom = 'Available from time is required.'
	if (!hasValue(formState.availableTo)) errors.availableTo = 'Available to time is required.'
	if (!hasValue(formState.status)) errors.status = 'Status is required.'
}

export function validateAdminResourceForm({ formState, coverImage, extraImages, existingAdditionalImageCount = 0 }) {
	const errors = {}

	validateRequiredFields(formState, errors)

	const nameLength = formState.name?.trim().length || 0
	if (nameLength > 0 && nameLength < RESOURCE_NAME_MIN_LENGTH) {
		errors.name = `Resource name must be at least ${RESOURCE_NAME_MIN_LENGTH} characters.`
	}
	if (nameLength > RESOURCE_NAME_MAX_LENGTH) {
		errors.name = `Resource name must be at most ${RESOURCE_NAME_MAX_LENGTH} characters.`
	}

	const capacity = Number(formState.capacity)
	if (!Number.isNaN(capacity)) {
		if (formState.type === 'EQUIPMENT') {
			if (capacity !== 1) {
				errors.capacity = 'Equipment capacity is fixed to 1.'
			}
		} else if (capacity <= 0) {
			errors.capacity = 'Capacity must be greater than 0.'
		}
	}

	const minMinutes = getTimeInMinutes(RESOURCE_MIN_TIME)
	const maxMinutes = getTimeInMinutes(RESOURCE_MAX_TIME)
	const fromMinutes = getTimeInMinutes(formState.availableFrom)
	const toMinutes = getTimeInMinutes(formState.availableTo)

	if (fromMinutes !== null && (fromMinutes < minMinutes || fromMinutes > maxMinutes)) {
		errors.availableFrom = 'Available from time must be between 08:00 and 20:00.'
	}

	if (toMinutes !== null && (toMinutes < minMinutes || toMinutes > maxMinutes)) {
		errors.availableTo = 'Available to time must be between 08:00 and 20:00.'
	}

	const descriptionLength = formState.description?.trim().length || 0
	if (descriptionLength > RESOURCE_DESCRIPTION_MAX_LENGTH) {
		errors.description = `Description must be at most ${RESOURCE_DESCRIPTION_MAX_LENGTH} characters.`
	}

	const normalizedCoverImages = Array.isArray(coverImage)
		? coverImage
		: coverImage
			? [coverImage]
			: []

	if (normalizedCoverImages.length > 1) {
		errors.coverImage = 'Only 1 cover image is allowed.'
	} else if (normalizedCoverImages[0] && !isSupportedImageFile(normalizedCoverImages[0])) {
		errors.coverImage = 'Cover image must be a JPG, JPEG, or PNG file.'
	}

	if ((extraImages?.length || 0) > 2) {
		errors.extraImages = 'You can upload up to 2 additional images.'
	}

	if ((existingAdditionalImageCount || 0) + (extraImages?.length || 0) > 2) {
		errors.extraImages = 'Only 2 additional images are allowed in total.'
	}

	if ((extraImages || []).some((file) => !isSupportedImageFile(file))) {
		errors.extraImages = 'Additional images must be JPG, JPEG, or PNG files.'
	}

	return errors
}

export function hasFormErrors(errors) {
	return Object.keys(errors).length > 0
}
