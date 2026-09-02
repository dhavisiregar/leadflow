import { useEffect, useState } from 'react'
import {
  getTeamMembers, inviteMember, updateMemberRole, removeMember,
} from '../api'
import { useAuth } from '../context/AuthContext'
import { UserPlus, Trash2, X, Clock } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

function InviteModal({ onClose, onInvited }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'member' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) return setError('Name and email are required')
    setLoading(true)
    setError('')
    try {
      const res = await inviteMember(form)
      onInvited(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Invite team member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input className="input" placeholder="Budi Santoso" autoFocus
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input className="input" type="email" placeholder="budi@company.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="member">Member</option>
              <option value="owner">Owner</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Sending...' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Team() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [removeError, setRemoveError] = useState('')

  useEffect(() => {
    getTeamMembers()
      .then(res => setMembers(res.data))
      .finally(() => setLoading(false))
  }, [])

  const handleInvited = (member) => {
    setMembers(prev => [...prev, member])
  }

  const handleRoleChange = async (member, role) => {
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role } : m))
    try {
      await updateMemberRole(member.id, role)
    } catch (err) {
      // revert on failure
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: member.role } : m))
      setRemoveError(err.response?.data?.message || 'Failed to update role')
    }
  }

  const handleRemove = async (id) => {
    setConfirmId(null)
    setRemoveError('')
    try {
      await removeMember(id)
      setMembers(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      setRemoveError(err.response?.data?.message || 'Failed to remove member')
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Team</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{members.length} people in your workspace</p>
        </div>
        {isOwner && (
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowInvite(true)}>
            <UserPlus size={14} />
            <span className="hidden sm:inline">Invite member</span>
            <span className="sm:hidden">Invite</span>
          </button>
        )}
      </div>

      {removeError && (
        <div className="mb-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {removeError}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading team...</p>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-700">
          {members.map(member => (
            <div
              key={member.id}
              className="group flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-400 text-sm font-semibold flex-shrink-0">
                  {member.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
                    {member.status === 'pending' && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <Clock size={9} /> Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {isOwner && member.id !== user.id ? (
                  <select
                    className="input py-1 text-xs w-24"
                    value={member.role}
                    onChange={e => handleRoleChange(member, e.target.value)}
                  >
                    <option value="member">Member</option>
                    <option value="owner">Owner</option>
                  </select>
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize px-2">{member.role}</span>
                )}
                {isOwner && member.id !== user.id && (
                  <button
                    onClick={() => setConfirmId(member.id)}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvited={handleInvited} />
      )}
      {confirmId && (
        <ConfirmModal
          message="This member will lose access to your workspace immediately."
          onConfirm={() => handleRemove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
