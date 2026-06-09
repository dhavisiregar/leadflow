import { useEffect, useState } from 'react'
import { getContacts, createContact, deleteContact } from '../api'
import { Plus, Trash2, Mail, Phone, Building2, X } from 'lucide-react'

function AddContactModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('Name is required')
    setLoading(true)
    try {
      const res = await createContact(form)
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create contact')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">New Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {error && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input className="input" placeholder="Budi Santoso"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input className="input" type="email" placeholder="budi@company.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input className="input" placeholder="+62 812 3456 7890"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
            <input className="input" placeholder="PT Maju Jaya"
              value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getContacts()
      .then((res) => setContacts(res.data))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id))
    try { await deleteContact(id) } catch { /* silently fail */ }
  }

  const filtered = contacts.filter((c) =>
    [c.name, c.email, c.company].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} contacts in your workspace</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add contact
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input className="input max-w-xs" placeholder="Search contacts..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading contacts...</p>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-sm">
            {search ? 'No contacts match your search.' : 'No contacts yet. Add your first one!'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {filtered.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-semibold">
                  {contact.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {contact.company && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Building2 size={10} />{contact.company}
                      </span>
                    )}
                    {contact.email && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Mail size={10} />{contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone size={10} />{contact.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(contact.id)}
                className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddContactModal
          onClose={() => setShowModal(false)}
          onCreated={(c) => setContacts((prev) => [c, ...prev])}
        />
      )}
    </div>
  )
}
