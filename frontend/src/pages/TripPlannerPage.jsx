import { useState, useEffect } from 'react'
import { Lightbulb, FileText, Ticket, CheckCircle2, Calendar, Plane, BedDouble, Wallet } from 'lucide-react'
import { trips as tripsApi } from '../api'

const STATUS_META = {
  idea:      { label: 'Idea',      Icon: Lightbulb,    bg: 'bg-warm-200',      text: 'text-warm-700'  },
  planning:  { label: 'Planning',  Icon: FileText,     bg: 'bg-warm-300/50',   text: 'text-warm-800'  },
  booked:    { label: 'Booked',    Icon: Ticket,       bg: 'bg-gold-400/20',   text: 'text-gold-600'  },
  completed: { label: 'Completed', Icon: CheckCircle2, bg: 'bg-terra-400/20',  text: 'text-terra-600' },
}

const STATUS_OPTS = Object.keys(STATUS_META)

const DEFAULT_FORM = {
  destination: '',
  travel_date: '',
  ticket_price: '',
  accommodation_price: '',
  notes: '',
  status: 'idea',
}

export default function TripPlannerPage() {
  const [tripsList, setTripsList] = useState([])
  const [statusFilter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(DEFAULT_FORM)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    tripsApi.list().then(setTripsList).finally(() => setLoading(false))
  }, [])

  const filtered = statusFilter === 'all'
    ? tripsList
    : tripsList.filter(t => t.status === statusFilter)

  const totalBudget = filtered.reduce(
    (sum, t) => sum + (t.ticket_price || 0) + (t.accommodation_price || 0),
    0
  )

  const openAdd = () => { setEditing(null); setForm(DEFAULT_FORM); setShowModal(true) }

  const openEdit = (trip) => {
    setEditing(trip)
    setForm({
      destination:          trip.destination,
      travel_date:          trip.travel_date || '',
      ticket_price:         trip.ticket_price?.toString() || '',
      accommodation_price:  trip.accommodation_price?.toString() || '',
      notes:                trip.notes || '',
      status:               trip.status,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      destination:         form.destination,
      travel_date:         form.travel_date         || null,
      ticket_price:        form.ticket_price        ? parseFloat(form.ticket_price)        : null,
      accommodation_price: form.accommodation_price ? parseFloat(form.accommodation_price) : null,
      notes:               form.notes               || null,
      status:              form.status,
    }
    if (editing) {
      const updated = await tripsApi.update(editing.id, payload)
      setTripsList(tripsList.map(t => t.id === editing.id ? updated : t))
    } else {
      const created = await tripsApi.create(payload)
      setTripsList([...tripsList, created])
    }
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    await tripsApi.remove(id)
    setTripsList(tripsList.filter(t => t.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-warm-50 tracking-tight">Trip Planner</h2>
          <p className="text-warm-200 text-sm mt-0.5 font-medium">{tripsList.length} trips</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-terra-600 hover:bg-terra-500 text-warm-50 text-sm font-semibold rounded-lg transition-colors"
        >
          + Add trip
        </button>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {STATUS_OPTS.map(s => {
          const count = tripsList.filter(t => t.status === s).length
          const { Icon, label, bg, text } = STATUS_META[s]
          return (
            <button
              key={s}
              onClick={() => setFilter(statusFilter === s ? 'all' : s)}
              className={`rounded-xl p-3 border text-left transition-colors ${
                statusFilter === s
                  ? `${bg} border-warm-300`
                  : 'bg-warm-50 border-warm-200 hover:border-warm-300'
              }`}
            >
              <div className={`text-xl font-bold ${text}`}>{count}</div>
              <div className={`text-xs mt-1 font-semibold flex items-center gap-1.5 ${text}`}>
                <Icon size={11} strokeWidth={2} />
                {label}
              </div>
            </button>
          )
        })}
      </div>

      {/* Budget line */}
      {totalBudget > 0 && (
        <p className="text-xs text-warm-300 mb-4 font-semibold flex items-center gap-1.5">
          <Wallet size={12} strokeWidth={2} />
          Estimated budget:{' '}
          <span className="text-warm-50">€{totalBudget.toLocaleString()}</span>
        </p>
      )}

      {/* Trips */}
      {loading ? (
        <p className="text-warm-400 text-sm font-medium">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-warm-400 text-sm py-12 text-center font-medium">
          {tripsList.length === 0 ? 'No trips yet — plan your next adventure!' : 'No trips match this filter.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map(trip => {
            const { Icon: StatusIcon, label, bg, text } = STATUS_META[trip.status]
            const budget = (trip.ticket_price || 0) + (trip.accommodation_price || 0)
            return (
              <li key={trip.id} className="bg-warm-50 border border-warm-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-warm-900">{trip.destination}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${bg} ${text} font-semibold`}>
                        <StatusIcon size={10} strokeWidth={2} />
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-warm-600 flex-wrap font-medium">
                      {trip.travel_date         && <span className="flex items-center gap-1"><Calendar  size={11} strokeWidth={2} />{trip.travel_date}</span>}
                      {trip.ticket_price        && <span className="flex items-center gap-1"><Plane      size={11} strokeWidth={2} />€{trip.ticket_price}</span>}
                      {trip.accommodation_price && <span className="flex items-center gap-1"><BedDouble  size={11} strokeWidth={2} />€{trip.accommodation_price}</span>}
                      {budget > 0               && <span className="text-warm-900 font-bold flex items-center gap-1"><Wallet size={11} strokeWidth={2} />€{budget.toLocaleString()}</span>}
                    </div>
                    {trip.notes && (
                      <p className="text-xs text-warm-700 mt-1.5 leading-relaxed font-medium">{trip.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(trip)}        className="text-warm-500 hover:text-warm-800 text-xs px-2 py-1 font-medium">Edit</button>
                    <button onClick={() => handleDelete(trip.id)} className="text-warm-400 hover:text-terra-500 text-xs px-2 py-1">✕</button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(20, 22, 14, 0.88)' }}
        >
          <div className="bg-warm-50 border border-warm-300 rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-warm-900 mb-4 tracking-tight">
              {editing ? 'Edit trip' : 'Add trip'}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                required
                placeholder="Destination (e.g. Tokyo, Japan)"
                value={form.destination}
                onChange={e => setForm({ ...form, destination: e.target.value })}
                className="border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="date"
                  value={form.travel_date}
                  onChange={e => setForm({ ...form, travel_date: e.target.value })}
                  className="flex-1 border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500"
                />
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="flex-1 border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500"
                >
                  {STATUS_OPTS.map(s => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="number"
                  placeholder="Ticket (€)"
                  value={form.ticket_price}
                  onChange={e => setForm({ ...form, ticket_price: e.target.value })}
                  step="0.01" min="0"
                  className="flex-1 border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500"
                />
                <input
                  type="number"
                  placeholder="Hotel / Airbnb (€)"
                  value={form.accommodation_price}
                  onChange={e => setForm({ ...form, accommodation_price: e.target.value })}
                  step="0.01" min="0"
                  className="flex-1 border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500"
                />
              </div>
              <textarea
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500 resize-none"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-warm-700 bg-warm-100 hover:bg-warm-200 border border-warm-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-warm-50 bg-terra-600 hover:bg-terra-500 rounded-lg transition-colors"
                >
                  {editing ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
