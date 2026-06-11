import { useEffect, useState } from 'react'
import { getContacts, createContact, updateContact, deleteContact } from '../api'
import { Plus, Trash2, Mail, Phone, Building2, X, Pencil } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

function ContactModal({ contact, onClose, onSaved }) {
  const isEdit = !!contact
  const [form, setForm] = useState(
    contact
      ? { name: contact.name, email: contact.email || '', phone: contact.phone || '', company: contact.company || '' }
      : { name: '', email: '', phone: '', company: '' }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('Name is required')
    setLoading(true)
    try {
      const res = isEdit
        ? await updateContact(contact.id, form)
        : await createContact(form)
      onSaved(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save contact')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Contact' : 'New Contact'}
          </h2>
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
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input className="input" type="email" placeholder="budi@company.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <input className="input" placeholder="+62 812 3456 7890"
              value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
            <input className="input" placeholder="PT Maju Jaya"
              value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Save contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | contact object
  const [confirmId, setConfirmId] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getContacts()
      .then(res => setContacts(res.data))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    setContacts(prev => prev.filter(c => c.id !== id))
    setConfirmId(null)
    try { await deleteContact(id) } catch {}
  }

  const handleSaved = (saved) => {
    setContacts(prev => {
      const exists = prev.find(c => c.id === saved.id)
      return exists ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev]
    })
  }

  const filtered = contacts.filter(c =>
    [c.name, c.email, c.company, c.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{contacts.length} contacts in your workspace</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal('add')}>
          <Plus size={14} />
          <span className="hidden sm:inline">Add contact</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="mb-4">
        <input className="input max-w-xs" placeholder="Search contacts..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading contacts...</p>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            {search ? 'No contacts match your search.' : 'No contacts yet. Add your first one!'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.map(contact => (
            <div
              key={contact.id}
              className="group flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-400 text-sm font-semibold flex-shrink-0">
                  {contact.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{contact.name}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5">
                    {contact.company && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Building2 size={10} />{contact.company}
                      </span>
                    )}
                    {contact.email && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Mail size={10} />{contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Phone size={10} />{contact.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions — visible on hover */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setModal(contact)}
                  className="text-gray-400 dark:text-gray-500 hover:text-brand-500 transition-colors p-1"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setConfirmId(contact.id)}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ContactModal
          contact={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {confirmId && (
        <ConfirmModal
          message="Contact will be permanently deleted."
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
