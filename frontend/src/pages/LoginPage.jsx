import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { authApi } from '../api'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login }           = useAuth()
  const navigate            = useNavigate()
  const [username, setUser] = useState('')
  const [password, setPass] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoad]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoad(true)
    try {
      const token = await authApi.login(username, password)
      login(token)
      navigate('/', { replace: true })
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoad(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-warm-50 tracking-tight">Trav with Ash</h1>
          <p className="text-warm-300 text-sm mt-1 font-medium">Your personal travel companion</p>
        </div>

        <div className="bg-warm-50 border border-warm-200 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-warm-900 mb-5">Sign in</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              required
              placeholder="Username"
              value={username}
              onChange={e => setUser(e.target.value)}
              autoComplete="username"
              className="border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500"
            />
            <input
              required
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPass(e.target.value)}
              autoComplete="current-password"
              className="border border-warm-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-warm-500"
            />
            {error && (
              <p className="text-terra-600 text-xs font-semibold">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-terra-600 hover:bg-terra-500 disabled:opacity-60 text-warm-50 text-sm font-semibold rounded-lg transition-colors"
            >
              <LogIn size={15} strokeWidth={2} />
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
