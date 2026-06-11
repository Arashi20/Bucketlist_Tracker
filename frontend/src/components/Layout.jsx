import { useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BookMarked, Globe, Plane, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/account',    Icon: User,       label: 'Account'      },
  { to: '/bucketlist', Icon: BookMarked, label: 'Bucketlist'   },
  { to: '/map',        Icon: Globe,      label: 'Scratch Map'  },
  { to: '/trips',      Icon: Plane,      label: 'Trip Planner' },
]

const IDLE_MS = 20 * 60 * 1000 // 20 minutes

export default function Layout({ children }) {
  const { logout } = useAuth()
  const navigate   = useNavigate()
  const timerRef   = useRef(null)

  // Idle logout — reset on any user activity
  useEffect(() => {
    const reset = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        logout()
        navigate('/login', { replace: true })
      }, IDLE_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [logout, navigate])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-warm-900">

      {/* ── Desktop sidebar ── */}
      <nav className="hidden md:flex w-56 flex-shrink-0 border-r border-warm-600 flex-col py-6 px-4 bg-warm-800">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-warm-50">Trav with Ash</h1>
        </div>
        <ul className="flex flex-col gap-1 flex-1">
          {navItems.map(({ to, Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-warm-700 text-warm-50 font-semibold border border-warm-500'
                      : 'text-warm-200 hover:text-warm-50 hover:bg-warm-700'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Logout at bottom of sidebar */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-warm-400 hover:text-warm-50 hover:bg-warm-700 transition-colors mt-2"
        >
          <LogOut size={15} strokeWidth={1.5} />
          <span>Sign out</span>
        </button>
      </nav>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-warm-600 bg-warm-800 flex-shrink-0">
          <span className="text-sm font-bold text-warm-50 tracking-wide">Trav with Ash</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-warm-400 hover:text-warm-200 transition-colors"
          >
            <LogOut size={13} strokeWidth={1.5} />
            Sign out
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 pb-24 md:p-8 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t-2 border-warm-600 flex"
        style={{ backgroundColor: '#1e2016' }}
      >
        {navItems.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                isActive ? 'text-gold-400' : 'text-warm-400 hover:text-warm-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className={isActive ? 'font-semibold' : ''}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  )
}
