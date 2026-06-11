import { useEffect, useState, useRef } from 'react'
import { getTasks, createTask, updateTask, completeTask, deleteTask, getLeads } from '../api'
import {
  CheckSquare, Square, Plus, Trash2, X,
  Calendar, AlertCircle, Layers, Check, Kanban, Pencil,
} from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

// ── helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const PRIORITY_CFG = {
  high:   { dot: 'bg-red-500',    badge: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',           label: 'High' },
  medium: { dot: 'bg-yellow-500', badge: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400', label: 'Medium' },
  low:    { dot: 'bg-gray-400',   badge: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',          label: 'Low' },
}

function todayMidnight() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}

function parseDue(str) {
  if (!str) return null
  return new Date(str.split('T')[0] + 'T00:00:00')
}

function sortTasks(list) {
  const now = todayMidnight()
  return [...list].sort((a, b) => {
    const aD = parseDue(a.due_date), bD = parseDue(b.due_date)
    const aOver = aD && aD < now && !a.is_completed
    const bOver = bD && bD < now && !b.is_completed
    if (aOver !== bOver) return aOver ? -1 : 1
    if (aD && bD && aD - bD !== 0) return aD - bD
    if (aD && !bD) return -1
    if (!aD && bD) return 1
    return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
  })
}

// ── sub-components ────────────────────────────────────────────────────────────

function DueDateBadge({ dueDate, isCompleted }) {
  if (!dueDate) return null
  const due = parseDue(dueDate)
  const now = todayMidnight()
  const diff = Math.round((due - now) / 86400000)

  let cls, label, Icon = Calendar
  if (!isCompleted && diff < 0) {
    cls = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    label = `${Math.abs(diff)}d overdue`
    Icon = AlertCircle
  } else if (diff === 0) {
    cls = 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
    label = 'Today'
  } else if (diff === 1) {
    cls = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    label = 'Tomorrow'
  } else {
    cls = 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
    label = due.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${cls}`}>
      <Icon size={9} />{label}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.medium
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function TaskRow({ task, onComplete, onDelete, onRequestDelete, onUpdated, leads }) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    title: task.title,
    priority: task.priority || 'medium',
    due_date: task.due_date ? task.due_date.split('T')[0] : '',
    lead_id: task.lead_id ? String(task.lead_id) : '',
  })
  const [saving, setSaving] = useState(false)
  const titleRef = useRef(null)

  useEffect(() => { if (editing) titleRef.current?.focus() }, [editing])

  const openEdit = (e) => {
    e.stopPropagation()
    setForm({
      title: task.title,
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      lead_id: task.lead_id ? String(task.lead_id) : '',
    })
    setEditing(true)
  }

  const cancel = () => setEditing(false)

  const save = async () => {
    if (!form.title.trim()) return cancel()
    setSaving(true)
    try {
      const res = await updateTask(task.id, {
        title: form.title.trim(),
        priority: form.priority,
        due_date: form.due_date ? form.due_date + 'T00:00:00Z' : '',
        lead_id: form.lead_id ? parseInt(form.lead_id) : null,
      })
      onUpdated(res.data)
      setEditing(false)
    } catch {}
    finally { setSaving(false) }
  }

  // ── Edit mode ──
  if (editing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-brand-300 dark:border-brand-600 shadow-sm p-3 space-y-2">
        <input
          ref={titleRef}
          className="input text-sm"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
        />
        <div className="flex flex-wrap gap-2">
          <input
            className="input text-xs flex-1 min-w-[120px]"
            type="date"
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          />
          <select
            className="input text-xs flex-1 min-w-[100px]"
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
          >
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">⚫ Low</option>
          </select>
          <select
            className="input text-xs flex-1 min-w-[130px]"
            value={form.lead_id}
            onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
          >
            <option value="">— No lead —</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={save} disabled={saving || !form.title.trim()}
              className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
              <Check size={12} />
            </button>
            <button onClick={cancel} className="btn-secondary px-3 py-1.5 text-xs">
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Normal mode ──
  return (
    <div
      className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all ${
        task.is_completed
          ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700/50 opacity-60'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-sm'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <button
        onClick={() => onComplete(task.id)}
        className={`flex-shrink-0 mt-0.5 transition-colors ${
          task.is_completed ? 'text-brand-500' : 'text-gray-300 dark:text-gray-600 hover:text-brand-500'
        }`}
      >
        {task.is_completed ? <CheckSquare size={15} /> : <Square size={15} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${
          task.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
        }`}>
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {task.lead && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-600 dark:text-brand-400">
              <Kanban size={9} />{task.lead.title}
            </span>
          )}
          <PriorityBadge priority={task.priority || 'medium'} />
          <DueDateBadge dueDate={task.due_date} isCompleted={task.is_completed} />
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div className={`flex items-center gap-1 flex-shrink-0 mt-0.5 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={openEdit} className="text-gray-400 dark:text-gray-500 hover:text-brand-500 transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={() => onRequestDelete(task.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-400 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function QuickAddRow({ leads, onCreated, defaultLeadId = '' }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', due_date: '', priority: 'medium', lead_id: defaultLeadId })
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const reset = () => {
    setOpen(false)
    setForm({ title: '', due_date: '', priority: 'medium', lead_id: defaultLeadId })
  }

  const save = async () => {
    if (!form.title.trim()) return reset()
    setSaving(true)
    try {
      const res = await createTask({
        title: form.title.trim(),
        due_date: form.due_date ? form.due_date + 'T00:00:00Z' : null,
        priority: form.priority,
        lead_id: form.lead_id ? parseInt(form.lead_id) : null,
      })
      onCreated(res.data)
      setForm({ title: '', due_date: '', priority: 'medium', lead_id: defaultLeadId })
      inputRef.current?.focus()
    } catch {}
    finally { setSaving(false) }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors border border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      >
        <Plus size={12} /> Add task...
      </button>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-brand-300 dark:border-brand-700 shadow-sm p-3 space-y-2">
      <input
        ref={inputRef}
        className="input text-sm"
        placeholder="Task title..."
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') reset() }}
      />
      <div className="flex flex-wrap gap-2">
        <input
          className="input text-xs flex-1 min-w-[120px]"
          type="date"
          value={form.due_date}
          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
        />
        <select
          className="input text-xs flex-1 min-w-[100px]"
          value={form.priority}
          onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
        >
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">⚫ Low</option>
        </select>
        <select
          className="input text-xs flex-1 min-w-[130px]"
          value={form.lead_id}
          onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
        >
          <option value="">— No lead —</option>
          {leads.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={save}
            disabled={saving || !form.title.trim()}
            className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
          >
            <Check size={12} />
          </button>
          <button onClick={reset} className="btn-secondary px-3 py-1.5 text-xs">
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function AddTaskModal({ leads, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', due_date: '', priority: 'medium', lead_id: '' })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtered = leads.filter(l => l.title.toLowerCase().includes(search.toLowerCase()))

  const submit = async () => {
    if (!form.title.trim()) return setError('Title is required')
    setLoading(true)
    try {
      const res = await createTask({
        title: form.title.trim(),
        due_date: form.due_date ? form.due_date + 'T00:00:00Z' : null,
        priority: form.priority,
        lead_id: form.lead_id ? parseInt(form.lead_id) : null,
      })
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16} /></button>
        </div>
        {error && (
          <div className="mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">{error}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              className="input" autoFocus
              placeholder="e.g. Follow up dengan PT Maju Jaya"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
            <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">⚫ Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
            <input className="input" type="date" value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Lead (optional)</label>
            <input className="input mb-1.5" placeholder="Search leads..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input" value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}>
              <option value="">— No lead —</option>
              {filtered.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={submit} disabled={loading}>
            {loading ? 'Creating...' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── empty state messages ──────────────────────────────────────────────────────

const EMPTY = {
  all:       { emoji: '📋', title: 'No tasks yet', sub: 'Add your first task to stay on top of your deals.' },
  today:     { emoji: '🎉', title: 'Nothing due today', sub: 'Enjoy the breathing room!' },
  overdue:   { emoji: '✅', title: "You're all caught up!", sub: 'No overdue tasks.' },
  completed: { emoji: '⬜', title: 'No completed tasks yet', sub: 'Start checking things off!' },
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'overdue', label: 'Overdue', urgent: true },
  { key: 'completed', label: 'Completed' },
]

// ── main page ─────────────────────────────────────────────────────────────────

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [tab, setTab] = useState('all')
  const [groupByLead, setGroupByLead] = useState(false)

  useEffect(() => {
    Promise.all([getTasks(), getLeads()])
      .then(([tr, lr]) => { setTasks(tr.data); setLeads(lr.data) })
      .finally(() => setLoading(false))
  }, [])

  const handleComplete = async (id) => {
    try {
      const res = await completeTask(id)
      setTasks(prev => prev.map(t => t.id === id ? res.data : t))
    } catch {}
  }

  const handleDelete = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setConfirmId(null)
    try { await deleteTask(id) } catch {}
  }

  const handleUpdated = (task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t))

  const handleCreated = (task) => setTasks(prev => [task, ...prev])

  // counts for tab badges
  const now = todayMidnight()
  const counts = {
    all: tasks.length,
    today: tasks.filter(t => {
      const d = parseDue(t.due_date)
      return d && d.getTime() === now.getTime() && !t.is_completed
    }).length,
    overdue: tasks.filter(t => {
      const d = parseDue(t.due_date)
      return d && d < now && !t.is_completed
    }).length,
    completed: tasks.filter(t => t.is_completed).length,
  }

  // filter for active tab
  const filtered = sortTasks((() => {
    switch (tab) {
      case 'today':     return tasks.filter(t => { const d = parseDue(t.due_date); return d && d.getTime() === now.getTime() && !t.is_completed })
      case 'overdue':   return tasks.filter(t => { const d = parseDue(t.due_date); return d && d < now && !t.is_completed })
      case 'completed': return tasks.filter(t => t.is_completed)
      default:          return tasks
    }
  })())

  // group by lead
  const grouped = (() => {
    const map = {}
    const order = []
    const noLead = []
    filtered.forEach(t => {
      if (!t.lead_id) { noLead.push(t); return }
      const k = t.lead_id
      if (!map[k]) { map[k] = { lead: t.lead, tasks: [] }; order.push(k) }
      map[k].tasks.push(t)
    })
    const result = order.map(k => map[k])
    if (noLead.length) result.push({ lead: null, tasks: noLead })
    return result
  })()

  if (loading) return <div className="p-8 text-sm text-gray-400 dark:text-gray-500">Loading tasks...</div>

  const empty = EMPTY[tab]
  const isEmpty = filtered.length === 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {counts.all} total
            {counts.overdue > 0 && <span className="text-red-500 font-medium"> · {counts.overdue} overdue</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupByLead(g => !g)}
            title="Group by Lead"
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
              groupByLead
                ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-400'
                : 'btn-secondary'
            }`}
          >
            <Layers size={13} />
            <span className="hidden sm:inline">Group by Lead</span>
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={14} />
            <span className="hidden sm:inline">Add task</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex-shrink-0 ${
              tab === t.key
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                t.urgent && counts[t.key] > 0
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : tab === t.key
                  ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">{empty.emoji}</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{empty.title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{empty.sub}</p>
          {tab === 'all' && (
            <button className="mt-4 btn-primary text-xs" onClick={() => setShowModal(true)}>
              <Plus size={12} className="inline mr-1" />Add first task
            </button>
          )}
        </div>
      ) : groupByLead ? (
        /* ── Grouped view ── */
        <div className="space-y-6">
          {grouped.map((group, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Kanban size={12} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                  {group.lead ? group.lead.title : 'No Lead'}
                </span>
                {group.lead?.stage && (
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white flex-shrink-0"
                    style={{ backgroundColor: group.lead.stage.color || '#718096' }}
                  >
                    {group.lead.stage.name}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {group.tasks.length}
                </span>
              </div>
              <div className="space-y-1.5 pl-5">
                {group.tasks.map(task => (
                  <TaskRow key={task.id} task={task} leads={leads} onComplete={handleComplete} onRequestDelete={() => setConfirmId(task.id)} onUpdated={handleUpdated} />
                ))}
                {tab !== 'completed' && (
                  <QuickAddRow
                    leads={leads}
                    onCreated={handleCreated}
                    defaultLeadId={group.lead?.id?.toString() || ''}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Flat view ── */
        <div className="space-y-1.5">
          {filtered.map(task => (
            <TaskRow key={task.id} task={task} leads={leads} onComplete={handleComplete} onRequestDelete={() => setConfirmId(task.id)} onUpdated={handleUpdated} />
          ))}
          {tab !== 'completed' && (
            <div className="pt-1">
              <QuickAddRow leads={leads} onCreated={handleCreated} />
            </div>
          )}
        </div>
      )}

      {showModal && (
        <AddTaskModal leads={leads} onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
      {confirmId && (
        <ConfirmModal
          message="Task will be permanently deleted."
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
