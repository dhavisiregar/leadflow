import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { getLeads, getStages, moveLead, createLead, updateLead, deleteLead } from '../api'
import { Plus, Trash2, DollarSign, X, Pencil } from 'lucide-react'

function formatIDR(val) {
  if (!val) return null
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
}

function AddLeadModal({ stageId, stages, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', value: '', stage_id: stageId })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('Title is required')
    setLoading(true)
    try {
      const res = await createLead({ ...form, value: parseFloat(form.value) || 0, stage_id: parseInt(form.stage_id) })
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">New Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {error && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input className="input" placeholder="e.g. PT Maju Jaya — Website project"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Value (IDR)</label>
            <input className="input" type="number" placeholder="5000000"
              value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
            <select className="input" value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create lead'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditLeadModal({ lead, stages, onClose, onUpdated }) {
  const [form, setForm] = useState({ title: lead.title, value: lead.value || '', notes: lead.notes || '', stage_id: lead.stage_id })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('Title is required')
    setLoading(true)
    try {
      const res = await updateLead(lead.id, { ...form, value: parseFloat(form.value) || 0, stage_id: parseInt(form.stage_id) })
      onUpdated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Edit Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {error && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Value (IDR)</label>
            <input className="input" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
            <select className="input" value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="input resize-none" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Pipeline() {
  const [leads, setLeads] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeStage, setActiveStage] = useState(null)
  const [editingLead, setEditingLead] = useState(null)

  useEffect(() => {
    Promise.all([getLeads(), getStages()])
      .then(([leadsRes, stagesRes]) => {
        setLeads(leadsRes.data)
        setStages(stagesRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const leadsByStage = (stageId) => leads.filter((l) => l.stage_id === stageId)

  const handleDragEnd = async (result) => {
    const { draggableId, destination } = result
    if (!destination) return

    const leadId = parseInt(draggableId)
    const newStageId = parseInt(destination.droppableId)

    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage_id: newStageId } : l))

    try {
      await moveLead(leadId, newStageId)
    } catch {
      // Revert on error
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage_id: l.stage_id } : l))
    }
  }

  const handleDelete = async (leadId) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
    try { await deleteLead(leadId) } catch { /* silently fail */ }
  }

  const handleCreated = (lead) => setLeads((prev) => [...prev, lead])
  const handleUpdated = (lead) => setLeads((prev) => prev.map((l) => l.id === lead.id ? lead : l))

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading pipeline...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} leads · drag to move between stages</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setActiveStage(stages[0]?.id); setShowModal(true) }}>
          <Plus size={14} /> Add lead
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageLeads = leadsByStage(stage.id)
            const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0)

            return (
              <div key={stage.id} className="flex-shrink-0 w-64">
                {/* Stage header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold text-gray-700">{stage.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{stageLeads.length}</span>
                  </div>
                  <button
                    className="text-gray-400 hover:text-brand-600 transition-colors"
                    onClick={() => { setActiveStage(stage.id); setShowModal(true) }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {stageValue > 0 && (
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                    <DollarSign size={10} />{formatIDR(stageValue)}
                  </p>
                )}

                <Droppable droppableId={String(stage.id)}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-24 rounded-xl space-y-2 p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-brand-50' : 'bg-gray-100'}`}
                    >
                      {stageLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg border p-3 text-xs shadow-sm transition-shadow ${snapshot.isDragging ? 'shadow-md border-brand-200' : 'border-gray-200'}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-gray-900 leading-snug">{lead.title}</p>
                                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingLead(lead) }}
                                    className="text-gray-300 hover:text-brand-500 transition-colors"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(lead.id) }}
                                    className="text-gray-300 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              {lead.value > 0 && (
                                <p className="text-gray-400 mt-1.5 flex items-center gap-1">
                                  <DollarSign size={10} />{formatIDR(lead.value)}
                                </p>
                              )}
                              {lead.contact?.name && (
                                <p className="text-gray-400 mt-1">{lead.contact.name}</p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {stageLeads.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">Drop leads here</p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {showModal && (
        <AddLeadModal
          stageId={activeStage}
          stages={stages}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          stages={stages}
          onClose={() => setEditingLead(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
