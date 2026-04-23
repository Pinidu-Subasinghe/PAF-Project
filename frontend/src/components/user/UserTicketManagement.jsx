import { useCallback, useEffect, useState } from 'react'
import { closeIncidentTicket, getIncidentTicketById } from '../../api/api'
import { authSessionChangeEvent, readAuthSession } from '../../utils/authSession'
import UserTicketInfo from './UserTicketInfo'

function useAuthSession() {
  const [session, setSession] = useState(() => readAuthSession())

  useEffect(() => {
    const syncSession = () => setSession(readAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(authSessionChangeEvent, syncSession)

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(authSessionChangeEvent, syncSession)
    }
  }, [])

  return session
}

export default function UserTicketManagement({ ticketId, onBack }) {
  const session = useAuthSession()
  const [ticket, setTicket] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadTicket = useCallback(async () => {
    if (!ticketId) {
      setTicket(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    try {
      const response = await getIncidentTicketById(ticketId)
      setTicket(response)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load ticket details right now.')
      setTicket(null)
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    loadTicket()
  }, [loadTicket])

  const handleClose = async () => {
    if (!ticket) return

    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await closeIncidentTicket(ticket.id)
      await loadTicket()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to close the ticket.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      >
        Back to tickets
      </button>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          Loading ticket details...
        </div>
      ) : (
        <UserTicketInfo
          ticket={ticket}
          currentUserEmail={session?.email ?? ''}
          onClose={handleClose}
          onRefresh={loadTicket}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
