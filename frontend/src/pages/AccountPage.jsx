import { useState, useEffect } from 'react'
import {
  Star, Compass, Mountain, Globe, Trophy,
  Home, Plane, MapPin,
  CheckCircle2, Ticket, Lightbulb, FileText,
  TrendingUp, Wallet, Calendar,
} from 'lucide-react'
import { bucketlist, visitedCountries, trips } from '../api'
import { useAuth } from '../context/AuthContext'

// ── Bucketlist level ──────────────────────────────────────────────────────────
function getBucketLevel(done) {
  if (done >= 50) return { label: 'World Traveler', Icon: Trophy,   prev: 50, next: null }
  if (done >= 30) return { label: 'Globetrotter',  Icon: Globe,    prev: 30, next: 50   }
  if (done >= 15) return { label: 'Adventurer',    Icon: Mountain, prev: 15, next: 30   }
  if (done >= 5)  return { label: 'Explorer',      Icon: Compass,  prev: 5,  next: 15   }
  return           { label: 'Dreamer',             Icon: Star,     prev: 0,  next: 5    }
}

// ── Scratch map level ─────────────────────────────────────────────────────────
function getMapLevel(count) {
  if (count >= 50) return { label: 'Citizen of the World', Icon: Trophy  }
  if (count >= 30) return { label: 'Globetrotter',         Icon: Globe   }
  if (count >= 15) return { label: 'Traveler',             Icon: Plane   }
  if (count >= 5)  return { label: 'Wanderer',             Icon: Compass }
  return                   { label: 'Homebody',            Icon: Home    }
}

const STATUS_META = {
  idea:      { Icon: Lightbulb,    label: 'Ideas'    },
  planning:  { Icon: FileText,     label: 'Planning' },
  booked:    { Icon: Ticket,       label: 'Booked'   },
  completed: { Icon: CheckCircle2, label: 'Done'     },
}

const TOTAL_COUNTRIES = 195

export default function AccountPage() {
  const { username }          = useAuth()
  const [items,     setItems] = useState([])
  const [visited,   setVisit] = useState([])
  const [tripsList, setTrips] = useState([])
  const [loading,   setLoad]  = useState(true)

  useEffect(() => {
    Promise.all([bucketlist.list(), visitedCountries.list(), trips.list()])
      .then(([i, v, t]) => { setItems(i); setVisit(v); setTrips(t) })
      .finally(() => setLoad(false))
  }, [])

  // Bucketlist stats
  const doneCount   = items.filter(i => i.status === 'done').length
  const bucketLevel = getBucketLevel(doneCount)
  const bucketPct   = bucketLevel.next
    ? ((doneCount - bucketLevel.prev) / (bucketLevel.next - bucketLevel.prev)) * 100
    : 100
  const { Icon: BucketIcon } = bucketLevel

  // Map stats
  const mapLevel   = getMapLevel(visited.length)
  const mapPct     = Math.round((visited.length / TOTAL_COUNTRIES) * 100)
  const { Icon: MapIcon } = mapLevel

  // Trip stats
  const totalBudget = tripsList.reduce(
    (s, t) => s + (t.ticket_price || 0) + (t.accommodation_price || 0), 0
  )
  const recentVisited = [...visited]
    .sort((a, b) => (b.visited_at || '').localeCompare(a.visited_at || ''))
    .slice(0, 4)
  const upcomingTrips = [...tripsList]
    .filter(t => t.status !== 'completed')
    .sort((a, b) => (a.travel_date || 'z').localeCompare(b.travel_date || 'z'))
    .slice(0, 4)

  const displayName = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : 'Traveler'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-warm-400 text-sm font-medium">
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Welcome ── */}  
      <div className="mb-6 text-center"> 
        <h2 className="text-2xl font-bold text-warm-50 tracking-tight">
          Welcome back, Arash
        </h2>
        <p className="text-warm-300 text-sm mt-0.5 font-medium">Here's your travel story so far.</p>
      </div>

      {/* ── Bucketlist XP card ── */}
      <div className="bg-warm-50 border border-warm-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">Bucketlist XP</span>
          <span className="text-xs text-warm-500 font-medium">
            {doneCount} item{doneCount !== 1 ? 's' : ''} completed
          </span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <BucketIcon size={18} strokeWidth={1.75} className="text-gold-600 flex-shrink-0" />
          <span className="text-xl font-bold text-warm-900">{bucketLevel.label}</span>
          {bucketLevel.next && (
            <span className="text-xs text-warm-500 font-medium ml-auto">
              {bucketLevel.next - doneCount} to next level
            </span>
          )}
        </div>
        <div className="h-2.5 bg-warm-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-terra-600 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(bucketPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-warm-500 mt-1.5 font-medium">
          <span>{bucketLevel.prev} done</span>
          {bucketLevel.next && <span>{bucketLevel.next} done</span>}
        </div>
      </div>

      {/* ── Two-col stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

        {/* Scratch Map */}
        <div className="bg-warm-50 border border-warm-200 rounded-xl p-5">
          <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">Scratch Map</span>
          <div className="flex items-center gap-2 mt-2 mb-3">
            <MapIcon size={16} strokeWidth={1.75} className="text-gold-600 flex-shrink-0" />
            <span className="text-lg font-bold text-warm-900">{mapLevel.label}</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold text-warm-900">{visited.length}</span>
              <span className="text-warm-500 text-sm font-medium ml-1">/ {TOTAL_COUNTRIES}</span>
            </div>
            <span className="text-lg font-bold text-gold-600">{mapPct}%</span>
          </div>
          <p className="text-xs text-warm-500 font-medium mt-1">of the world explored</p>
        </div>

        {/* Trips */}
        <div className="bg-warm-50 border border-warm-200 rounded-xl p-5">
          <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">Trips</span>
          <div className="flex items-center gap-2 mt-2 mb-3">
            <TrendingUp size={16} strokeWidth={1.75} className="text-gold-600 flex-shrink-0" />
            <span className="text-lg font-bold text-warm-900">{tripsList.length} total</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3">
            {Object.entries(STATUS_META).map(([key, { Icon, label }]) => {
              const count = tripsList.filter(t => t.status === key).length
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs text-warm-600 font-medium">
                  <Icon size={11} strokeWidth={2} className="flex-shrink-0" />
                  <span>{count} {label}</span>
                </div>
              )
            })}
          </div>
          {totalBudget > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-warm-700 font-semibold border-t border-warm-200 pt-2 mt-1">
              <Wallet size={11} strokeWidth={2} />
              €{totalBudget.toLocaleString()} tracked
            </div>
          )}
        </div>
      </div>

      {/* ── Highlights ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Recent visited countries */}
        <div className="bg-warm-50 border border-warm-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={13} strokeWidth={2} className="text-warm-500" />
            <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">Recently Visited</span>
          </div>
          {recentVisited.length === 0 ? (
            <p className="text-xs text-warm-400 font-medium">No countries yet — go explore!</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentVisited.map(v => (
                <li key={v.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} strokeWidth={1.75} className="text-gold-600 flex-shrink-0" />
                    <span className="font-semibold text-warm-900">{v.country_name}</span>
                  </div>
                  {v.visited_at && (
                    <span className="text-xs text-warm-400 font-medium flex-shrink-0">{v.visited_at}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming / active trips */}
        <div className="bg-warm-50 border border-warm-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Plane size={13} strokeWidth={2} className="text-warm-500" />
            <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">Upcoming Trips</span>
          </div>
          {upcomingTrips.length === 0 ? (
            <p className="text-xs text-warm-400 font-medium">No upcoming trips — start planning!</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcomingTrips.map(t => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Plane size={12} strokeWidth={1.75} className="text-gold-600 flex-shrink-0" />
                    <span className="font-semibold text-warm-900 truncate">{t.destination}</span>
                  </div>
                  {t.travel_date ? (
                    <span className="text-xs text-warm-400 font-medium flex-shrink-0 flex items-center gap-1 ml-2">
                      <Calendar size={10} strokeWidth={2} />{t.travel_date}
                    </span>
                  ) : (
                    <span className="text-xs text-warm-400 font-medium flex-shrink-0 ml-2 capitalize">{t.status}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
