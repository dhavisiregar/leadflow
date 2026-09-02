import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getInviteInfo, acceptInvite } from '../api'
import { Zap, Sun, Moon } from 'lucide-react'

export default function AcceptInvite() {
  const { signIn } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [invite, setInvite] = useState(null)
  const [checking, setChecking] = useState(true)
  const [inviteError, setInviteError] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setInviteError('This invite link is missing a token.')
      setChecking(false)
      return
    }
    getInviteInfo(token)
      .then(res => setInvite(res.data))
      .catch(err => setInviteError(err.response?.data?.message || 'This invite is invalid or has expired.'))
      .finally(() => setChecking(false))
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirmPassword) return setError('Passwords do not match')

    setLoading(true)
    try {
      const res = await acceptInvite(token, password)
      signIn(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <button
        onClick={toggle}
        className="fixed top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">LeadFlow</span>
        </div>

        <div className="card p-6">
          {checking ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Checking your invite...</p>
          ) : inviteError ? (
            <>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Invite not valid</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{inviteError}</p>
              <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
                Go to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Join {invite.tenant_name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Set a password for <span className="font-medium">{invite.email}</span> to get started.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                  <input type="password" className="input" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm password</label>
                  <input type="password" className="input" placeholder="••••••••"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Joining...' : 'Accept invite & sign in'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
