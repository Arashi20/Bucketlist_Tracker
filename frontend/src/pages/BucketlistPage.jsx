import { useState, useEffect } from 'react'
import { Globe, MapPin, Building2, Zap, Star, Compass, Mountain, Trophy, Check } from 'lucide-react'
import { bucketlist } from '../api'

const ITEM_TYPES = ['all', 'country', 'region', 'city', 'activity']

const TYPE_META = {
  country:  { label: 'Country',  plural: 'Countries',  Icon: Globe      },
  region:   { label: 'Region',   plural: 'Regions',    Icon: MapPin     },
  city:     { label: 'City',     plural: 'Cities',     Icon: Building2  },
  activity: { label: 'Activity', plural: 'Activities', Icon: Zap        },
}

function getLevel(done) {
  if (done >= 50) return { label: 'World Traveler', Icon: Trophy,   prev: 50, next: null }
  if (done >= 30) return { label: 'Globetrotter',  Icon: Globe,    prev: 30, next: 50   }
  if (done >= 15) return { label: 'Adventurer',    Icon: Mountain, prev: 15, next: 30   }
  if (done >= 5)  return { label: 'Explorer',      Icon: Compass,  prev: 5,  next: 15   }
  return           { label: 'Dreamer',             Icon: Star,     prev: 0,  next: 5    }
}

const DEFAULT_FORM = { name: '', type: 'country', status: 'wishlist', description: '' }

export default function BucketlistPage() {
  const [items, setItems]           = useState([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(DEFAULT_FORM)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    bucketlist.list().then(setItems).finally(() => setLoading(false))
  }, [])

  const filtered = typeFilter === 'all'
    ? items
    : items.filter(item => item.type === typeFilter)

  const doneCount = items.filter(i => i.status === 'done').length
  const level     = getLevel(doneCount)
  const progress  = level.next
    ? ((doneCount - level.prev) / (level.next - level.prev)) * 100
    : 100

  const openAdd = () => { setEditing(null); setForm(DEFAULT_FORM); setShowModal(true) }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name, type: item.type, status: item.status, description: item.description || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, description: form.description || null }
    if (editing) {
      const updated = await bucketlist.update(editing.id, payload)
      setItems(items.map(i => i.id === editing.id ? updated : i))
    } else {
      const created = await bucketlist.create(payload)
      setItems([...items, created])
    }
    setShowModal(false)
  }

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'done' ? 'wishlist' : 'done'
    const updated   = await bucketlist.update(item.id, { status: newStatus })
    setItems(items.map(i => i.id === item.id ? updated : i))
  }

  const handleDelete = async (id) => {
    await bucketlist.remove(id)
    setItems(items.filter(i => i.id !== id))
  }

  const { Icon: LevelIcon } = level

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-warm-50 tracking-tight">Bucketlist</h2>
          <p className="text-warm-200 text-sm mt-0.5 font-medium">{items.length} items · {doneCount} completed</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-terra-600 hover:bg-terra-500 text-warm-50 text-sm font-semibold rounded-lg transition-colors"
        >
          + Add item
        </button>
      </div>

      {/* Level card */}
      <div className="bg-warm-50 border border-warm-200 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-warm-900 flex items-center gap-2">
            <LevelIcon size={14} strokeWidth={2} className="text-gold-600" />
            {level.label}
          </span>
          <span className="text-xs text-warm-600 font-medium">
            {level.next
              ? `${doneCount} / ${level.next} to next level`
              : `${doneCount} done — max level!`}
          </span>
        </div>
        <div className="h-2 bg-warm-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-terra-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-warm-600 font-medium">
          {ITEM_TYPES.slice(1).map(type => {
            const { Icon: TypeIcon, plural } = TYPE_META[type]
            const typeItems = items.filter(i => i.type === type)
            const typeDone  = typeItems.filter(i => i.status === 'done').length
            return (
              <span key={type} className="flex items-center gap-1.5">
                <TypeIcon size={11} strokeWidth={1.75} />
                {typeDone}/{typeItems.length} {plural}
              </span>
            )
          })}
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {ITEM_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              typeFilter === t
                ? 'bg-warm-600 text-warm-50 border border-warm-500'
                : 'text-warm-200 hover:text-warm-50 hover:bg-warm-700'
            }`}
          >
            {t === 'all' ? 'All' : TYPE_META[t].label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-warm-400 text-sm font-medium">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-warm-400 text-sm py-12 text-center font-medium">
          {items.length === 0 ? 'No items yet — add your first one!' : 'No items match this filter.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map(item => {
            const { Icon: TypeIcon } = TYPE_META[item.type] ?? {}
            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  item.status === 'done'
                    ? 'bg-warm-100 border-warm-200'
                    : 'bg-warm-50 border-warm-200'
                }`}
              >
                {/* Check circle */}
                <button
                  onClick={() => toggleStatus(item)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    item.status === 'done'
                      ? 'border-gold-500 bg-gold-500'
                      : 'border-warm-400 hover:border-gold-500'
                  }`}
                >
                  {item.status === 'done' && (
                    <Check size={11} strokeWidth={3} className="text-warm-50" />
                  )}
                </button>

                {TypeIcon && <TypeIcon size={14} strokeWidth={1.5} className="text-warm-500 flex-shrink-0" />}

                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold ${item.status === 'done' ? 'line-through text-warm-400' : 'text-warm-900'}`}>
                    {item.name}
                  </span>
                  {item.description && (
                    <p className="text-xs text-warm-600 mt-0.5 truncate font-medium">{item.description}</p>
                  )}
                </div>

                <span className="text-xs text-warm-500 capitalize hidden sm:block font-medium">{item.type}</span>
                <button onClick={() => openEdit(item)}        className="text-warm-500 hover:text-warm-800 text-xs px-2 py-1 font-medium">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-warm-400 hover:text-terra-500 text-xs px-2 py-1">✕</button>
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
              {editing ? 'Edit item' : 'Add item'}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                required
                placeholder="Name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500"
              />
              <div className="flex gap-2">
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="flex-1 border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500"
                >
                  {ITEM_TYPES.slice(1).map(t => (
                    <option key={t} value={t}>{TYPE_META[t].label}</option>
                  ))}
                </select>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="flex-1 border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500"
                >
                  <option value="wishlist">Wishlist</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <textarea
                placeholder="Notes (optional)"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500 resize-none"
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
