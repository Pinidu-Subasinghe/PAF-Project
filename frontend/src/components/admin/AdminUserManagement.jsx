import { useEffect, useState, useMemo } from 'react'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { getAdminUsers, createAdminUser, deleteAdminUser, updateAdminUserRole } from '../../api/api'
import { HiOutlineTrash } from 'react-icons/hi2'
import { toast } from 'react-toastify'

function formatEnumLabel(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('USER')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [updatingIds, setUpdatingIds] = useState([])
  const [deletingIds, setDeletingIds] = useState([])
  const [filterName, setFilterName] = useState('')
  const [filterEmail, setFilterEmail] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')

  const loadUsers = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const resp = await getAdminUsers()
      setUsers(Array.isArray(resp) ? resp : [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load users.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const name = (filterName || '').trim().toLowerCase()
    const emailFilter = (filterEmail || '').trim().toLowerCase()
    const roleFilter = (filterRole || 'ALL')

    return users.filter((u) => {
      if (name) {
        const full = (u.fullName || '').toLowerCase()
        if (!full.includes(name)) return false
      }

      if (emailFilter) {
        const em = (u.email || '').toLowerCase()
        if (!em.includes(emailFilter)) return false
      }

      if (roleFilter && roleFilter !== 'ALL') {
        if (u.role !== roleFilter) return false
      }

      return true
    })
  }, [users, filterName, filterEmail, filterRole])

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setPassword('')
    setRole('USER')
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const details = `${fullName.trim() || email.trim()} (${role})`

    const confirmation = await Swal.fire({
      title: 'Create user? ',
      text: `Create user ${details}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, create',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#059669',
    })

    if (!confirmation.isConfirmed) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
      }

      const created = await createAdminUser(payload)
      setUsers((current) => [created, ...current])
      toast.success('User created')
      resetForm()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create user.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (user) => {
    const confirmation = await Swal.fire({
      title: 'Delete user?',
      text: `Are you sure you want to delete ${user.fullName || user.email}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    })

    if (!confirmation.isConfirmed) return

    setDeletingIds((prev) => [...prev, user.id])
    setErrorMessage('')
    try {
      await deleteAdminUser(user.id)
      setUsers((current) => current.filter((u) => u.id !== user.id))
      toast.success('User deleted')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete user.')
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== user.id))
    }
  }

  const handleRoleChange = async (user, newRole) => {
    if (!user) return

    const confirmation = await Swal.fire({
      title: 'Change role? ',
      text: `Are you sure change ${user.fullName || user.email} from ${user.role} to ${newRole}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, change role',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#059669',
    })

    if (!confirmation.isConfirmed) return

    setUpdatingIds((prev) => [...prev, user.id])
    setErrorMessage('')
    try {
      const updated = await updateAdminUserRole(user.id, { role: newRole })
      setUsers((current) => current.map((u) => (u.id === user.id ? updated : u)))
      toast.success('Role updated')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update role.')
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== user.id))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <p className="mt-1 text-sm text-slate-500">Create, view, and manage user accounts.</p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-2" onSubmit={handleCreate}>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Full name
          <input
            required
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Jane Doe"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="user@example.com"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Password
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Create a password"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="USER">{formatEnumLabel('USER')}</option>
            <option value="ADMIN">{formatEnumLabel('ADMIN')}</option>
            <option value="TECHNICIAN">{formatEnumLabel('TECHNICIAN')}</option>
          </select>
        </label>

        <div className="md:col-span-2 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
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

      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">Loading users...</div>
      )}

      {!isLoading && users.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">No users found.</div>
      )}

      {!isLoading && users.length > 0 && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Name
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Search by name"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email
                <input
                  type="text"
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.value)}
                  placeholder="Search by email"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Role
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ALL">All roles</option>
                  <option value="USER">{formatEnumLabel('USER')}</option>
                  <option value="ADMIN">{formatEnumLabel('ADMIN')}</option>
                  <option value="TECHNICIAN">{formatEnumLabel('TECHNICIAN')}</option>
                </select>
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => { setFilterName(''); setFilterEmail(''); setFilterRole('ALL') }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
              >
                Clear filters
              </button>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">No users match filters.</div>
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{user.fullName || user.email}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">{user.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:justify-end">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      disabled={updatingIds.includes(user.id)}
                      className="min-w-[9rem] rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="USER">{formatEnumLabel('USER')}</option>
                      <option value="ADMIN">{formatEnumLabel('ADMIN')}</option>
                      <option value="TECHNICIAN">{formatEnumLabel('TECHNICIAN')}</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      disabled={deletingIds.includes(user.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-rose-600 hover:bg-rose-50"
                      aria-label={`Delete ${user.email}`}
                    >
                      <HiOutlineTrash className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
