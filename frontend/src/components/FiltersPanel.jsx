import React from 'react'

function formatEnumLabel(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const typeOptions = [
  { value: '', label: 'All types' },
  { value: 'LECTURE_HALL', label: 'Lecture Hall' },
  { value: 'LAB', label: 'Lab' },
  { value: 'MEETING_ROOM', label: 'Meeting Room' },
  { value: 'EQUIPMENT', label: 'Equipment' },
]

const statusOptions = [
  { value: '', label: 'Any status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OUT_OF_SERVICE', label: 'Out of service' },
]

const equipmentCategoryOptions = ['PROJECTOR', 'SMART_BOARD', 'SPEAKER', 'MICROPHONE', 'CAMERA', 'OTHER']

export default function FiltersPanel({ filters, setFilters }) {
  return (
    <div className="sticky top-24">
      <div className="space-y-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Type
          <select
            value={filters.type}
            onChange={(e) => setFilters((c) => ({ ...c, type: e.target.value, equipmentCategory: e.target.value === 'EQUIPMENT' ? (c.equipmentCategory ?? '') : '' }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        {filters.type === 'EQUIPMENT' && (
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Equipment Category
            <select
              value={filters.equipmentCategory || ''}
              onChange={(e) => setFilters((c) => ({ ...c, equipmentCategory: e.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All equipment</option>
              {equipmentCategoryOptions.map((opt) => (
                <option key={opt} value={opt}>{formatEnumLabel(opt)}</option>
              ))}
            </select>
          </label>
        )}

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Minimum Capacity
          <input
            type="number"
            min="1"
            value={filters.minCapacity}
            onChange={(e) => setFilters((c) => ({ ...c, minCapacity: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. 50"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Location
          <input
            type="text"
            value={filters.location}
            onChange={(e) => setFilters((c) => ({ ...c, location: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search building or block"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Status
          <select
            value={filters.status}
            onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
