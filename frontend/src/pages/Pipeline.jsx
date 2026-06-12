import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  getLeads,
  getStages,
  getContacts,
  getLead,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  moveLead,
  createLead,
  updateLead,
  deleteLead,
} from "../api";
import {
  Plus,
  Trash2,
  DollarSign,
  X,
  Pencil,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  User as UserIcon,
  Tag,
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import UpgradePrompt from "../components/UpgradePrompt";

const CLOSE_REASONS = [
  "Price",
  "Timeline",
  "Competition",
  "No Budget",
  "Wrong Fit",
  "Other",
];

const ACT_ICONS = {
  call: Phone,
  email: Mail,
  meeting: MessageSquare,
  note: FileText,
};
const ACT_COLORS = {
  call: "text-blue-500",
  email: "text-green-500",
  meeting: "text-purple-500",
  note: "text-gray-400 dark:text-gray-500",
};

function AgingBadge({ lead }) {
  const ref = lead.last_activity_at
    ? new Date(lead.last_activity_at)
    : new Date(lead.created_at);
  const days = Math.floor((Date.now() - ref.getTime()) / 86400000);
  const cls =
    days < 3
      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
      : days <= 7
        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${cls}`}
    >
      <Clock size={9} />
      {days}d
    </span>
  );
}

function formatIDR(val) {
  if (!val) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

function CloseReasonModal({ lead, targetStage, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const isWon = targetStage?.name === "Won";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Mark as {targetStage?.name}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {lead?.title}
          </span>
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isWon ? "Win reason *" : "Loss reason *"}
            </label>
            <select
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Select reason...</option>
              {CLOSE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Note (optional)
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              value={note}
              placeholder="Any additional context..."
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`flex-1 text-xs font-medium py-2 px-4 rounded-lg transition-colors text-white ${isWon ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}
            onClick={() => reason && onConfirm(reason, note)}
            disabled={!reason}
          >
            Confirm {targetStage?.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddLeadModal({ stageId, stages, contacts, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    value: "",
    stage_id: stageId,
    contact_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError("Title is required");
    setLoading(true);
    try {
      const res = await createLead({
        ...form,
        value: parseFloat(form.value) || 0,
        stage_id: parseInt(form.stage_id),
        contact_id: form.contact_id ? parseInt(form.contact_id) : null,
      });
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            New Lead
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
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
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              className="input"
              placeholder="e.g. PT Maju Jaya — Website project"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact
            </label>
            <select
              className="input"
              value={form.contact_id}
              onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
            >
              <option value="">— No contact —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Value (IDR)
            </label>
            <input
              className="input"
              type="number"
              placeholder="5000000"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stage
            </label>
            <select
              className="input"
              value={form.stage_id}
              onChange={(e) => setForm({ ...form, stage_id: e.target.value })}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary flex-1"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditLeadModal({ lead, stages, contacts, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: lead.title,
    value: lead.value || "",
    notes: lead.notes || "",
    stage_id: lead.stage_id,
    contact_id: lead.contact_id || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError("Title is required");
    setLoading(true);
    try {
      const res = await updateLead(lead.id, {
        ...form,
        value: parseFloat(form.value) || 0,
        stage_id: parseInt(form.stage_id),
        contact_id: form.contact_id ? parseInt(form.contact_id) : null,
      });
      onUpdated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Edit Lead
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
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
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact
            </label>
            <select
              className="input"
              value={form.contact_id}
              onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
            >
              <option value="">— No contact —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Value (IDR)
            </label>
            <input
              className="input"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stage
            </label>
            <select
              className="input"
              value={form.stage_id}
              onChange={(e) => setForm({ ...form, stage_id: e.target.value })}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary flex-1"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadDetailPanel({ leadId, onClose, onUpdated }) {
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [valueDraft, setValueDraft] = useState("");
  const [actType, setActType] = useState("call");
  const [actNote, setActNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [confirmDeleteActivityId, setConfirmDeleteActivityId] = useState(null);
  const [featureError, setFeatureError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getLead(leadId), getActivities(leadId)])
      .then(([lr, ar]) => {
        setLead(lr.data);
        setTitleDraft(lr.data.title);
        setValueDraft(lr.data.value || "");
        setActivities(ar.data);
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          setFeatureError(
            err.response?.data?.message ||
              "Lead detail page is not available on your plan",
          );
        }
      })
      .finally(() => setLoading(false));
  }, [leadId]);

  const saveField = async (field) => {
    if (field === "title" && !titleDraft.trim()) return setEditingField(null);
    try {
      const res = await updateLead(lead.id, {
        title: field === "title" ? titleDraft.trim() : lead.title,
        value: field === "value" ? parseFloat(valueDraft) || 0 : lead.value,
        notes: lead.notes || "",
        stage_id: lead.stage_id,
        contact_id: lead.contact_id || null,
      });
      setLead(res.data);
      setTitleDraft(res.data.title);
      setValueDraft(res.data.value || "");
      onUpdated(res.data);
    } finally {
      setEditingField(null);
    }
  };

  const handleAddActivity = async () => {
    if (!actNote.trim()) return;
    setSubmitting(true);
    try {
      const res = await createActivity(leadId, {
        type: actType,
        note: actNote,
      });
      setActivities((prev) => [res.data, ...prev]);
      setActNote("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateActivity = async (activityId) => {
    if (!editingActivity.note.trim()) return;
    setSubmitting(true);
    try {
      const res = await updateActivity(leadId, activityId, {
        type: editingActivity.type,
        note: editingActivity.note,
      });
      setActivities((prev) => prev.map((a) => (a.id === activityId ? res.data : a)));
      setEditingActivity(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    setConfirmDeleteActivityId(activityId);
  };

  const confirmDeleteActivity = async () => {
    try {
      await deleteActivity(leadId, confirmDeleteActivityId);
      setActivities((prev) => prev.filter((a) => a.id !== confirmDeleteActivityId));
    } finally {
      setConfirmDeleteActivityId(null);
    }
  };

  const isClosedStage =
    lead?.stage?.name === "Won" || lead?.stage?.name === "Lost";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Lead Detail
          </p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            Loading...
          </div>
        ) : featureError ? (
          <div className="flex-1 flex items-center justify-center p-5">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Lead Detail Not Available
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Upgrade to a paid plan to view lead details.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate("/billing")}
                  className="text-xs text-white bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 font-medium px-3 py-1.5 rounded"
                >
                  View subscription plans
                </button>
                <button
                  onClick={onClose}
                  className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-5 space-y-4">
              {/* Title inline edit */}
              {editingField === "title" ? (
                <input
                  autoFocus
                  className="input font-semibold text-sm w-full"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => saveField("title")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveField("title");
                    if (e.key === "Escape") setEditingField(null);
                  }}
                />
              ) : (
                <h2
                  className="text-base font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-brand-600 group flex items-start gap-1.5 transition-colors"
                  onClick={() => setEditingField("title")}
                >
                  <span className="leading-snug">{lead.title}</span>
                  <Pencil
                    size={11}
                    className="text-gray-300 dark:text-gray-600 group-hover:text-brand-400 flex-shrink-0 mt-1"
                  />
                </h2>
              )}

              {/* Stage + Value */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: lead.stage?.color || "#718096" }}
                >
                  {lead.stage?.name}
                </span>

                {editingField === "value" ? (
                  <input
                    autoFocus
                    className="input w-32 text-xs"
                    type="number"
                    value={valueDraft}
                    onChange={(e) => setValueDraft(e.target.value)}
                    onBlur={() => saveField("value")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveField("value");
                      if (e.key === "Escape") setEditingField(null);
                    }}
                  />
                ) : (
                  <button
                    className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-brand-600 transition-colors"
                    onClick={() => setEditingField("value")}
                  >
                    <DollarSign size={11} />
                    {lead.value > 0 ? (
                      formatIDR(lead.value)
                    ) : (
                      <span className="italic text-gray-400 dark:text-gray-500">
                        Add value
                      </span>
                    )}
                    <Pencil
                      size={9}
                      className="text-gray-300 dark:text-gray-600"
                    />
                  </button>
                )}
              </div>

              {/* Contact & Owner */}
              <div className="space-y-1.5 text-xs">
                {lead.contact?.name && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <UserIcon
                      size={13}
                      className="text-gray-400 dark:text-gray-500 flex-shrink-0"
                    />
                    <span>{lead.contact.name}</span>
                    {lead.contact.company && (
                      <span className="text-gray-400 dark:text-gray-500">
                        · {lead.contact.company}
                      </span>
                    )}
                  </div>
                )}
                {lead.owner?.name && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Tag
                      size={13}
                      className="text-gray-400 dark:text-gray-500 flex-shrink-0"
                    />
                    <span>Owner: {lead.owner.name}</span>
                  </div>
                )}
              </div>

              {/* Close reason */}
              {isClosedStage && lead.close_reason && (
                <div
                  className={`rounded-lg p-3 text-xs ${
                    lead.stage?.name === "Won"
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800"
                  }`}
                >
                  <p className="font-medium text-gray-700 dark:text-gray-200">
                    {lead.stage?.name === "Won" ? "Win reason" : "Loss reason"}:{" "}
                    {lead.close_reason}
                  </p>
                  {lead.close_note && (
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      {lead.close_note}
                    </p>
                  )}
                </div>
              )}

              {/* Log activity */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Log activity
                </p>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {["call", "email", "meeting", "note"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setActType(t)}
                      className={`text-[10px] font-medium py-1.5 rounded-lg capitalize transition-colors ${
                        actType === t
                          ? "bg-brand-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input resize-none w-full mb-2 text-xs"
                  rows={2}
                  placeholder="Add a note..."
                  value={actNote}
                  onChange={(e) => setActNote(e.target.value)}
                />
                <button
                  className="btn-primary w-full text-xs"
                  onClick={handleAddActivity}
                  disabled={submitting || !actNote.trim()}
                >
                  {submitting ? "Saving..." : "Log activity"}
                </button>
              </div>

              {/* Activity feed */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4 pb-4">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-3">
                  Activity
                  {activities.length > 0 && (
                    <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
                      ({activities.length})
                    </span>
                  )}
                </p>
                {activities.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                    No activities yet — log the first one above
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((act) => {
                      const Icon = ACT_ICONS[act.type] || FileText;
                      const isEditing = editingActivity?.id === act.id;
                      return (
                        <div
                          key={act.id}
                          className={`group flex gap-3 ${isEditing ? "bg-gray-50 dark:bg-gray-700/50 p-3 rounded" : ""}`}
                        >
                          <div
                            className={`flex-shrink-0 mt-0.5 ${ACT_COLORS[act.type] || "text-gray-400 dark:text-gray-500"}`}
                          >
                            <Icon size={13} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="space-y-2">
                                <select
                                  className="input text-xs"
                                  value={editingActivity.type}
                                  onChange={(e) =>
                                    setEditingActivity({
                                      ...editingActivity,
                                      type: e.target.value,
                                    })
                                  }
                                >
                                  <option value="call">Call</option>
                                  <option value="email">Email</option>
                                  <option value="meeting">Meeting</option>
                                  <option value="note">Note</option>
                                </select>
                                <textarea
                                  className="input text-xs"
                                  placeholder="Activity note..."
                                  rows="2"
                                  value={editingActivity.note}
                                  onChange={(e) =>
                                    setEditingActivity({
                                      ...editingActivity,
                                      note: e.target.value,
                                    })
                                  }
                                />
                                <div className="flex gap-1">
                                  <button
                                    className="btn-secondary text-xs flex-1"
                                    onClick={() => setEditingActivity(null)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="btn-primary text-xs flex-1"
                                    onClick={() => handleUpdateActivity(act.id)}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs text-gray-800 dark:text-gray-200 leading-snug">
                                  {act.note}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                                  {act.type} · {act.created_by?.name} ·{" "}
                                  {new Date(act.created_at).toLocaleDateString(
                                    "id-ID",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </p>
                              </>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingActivity(act)}
                                className="text-gray-400 dark:text-gray-500 hover:text-brand-500 transition-colors p-0.5"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteActivity(act.id)}
                                className="text-gray-400 dark:text-gray-500 hover:text-red-400 transition-colors p-0.5"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {confirmDeleteActivityId && (
          <ConfirmModal
            message="Activity will be permanently deleted."
            onConfirm={confirmDeleteActivity}
            onCancel={() => setConfirmDeleteActivityId(null)}
          />
        )}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeStage, setActiveStage] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    Promise.all([getLeads(), getStages(), getContacts()])
      .then(([leadsRes, stagesRes, contactsRes]) => {
        setLeads(leadsRes.data);
        setStages(stagesRes.data);
        setContacts(contactsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const leadsByStage = (stageId) => leads.filter((l) => l.stage_id === stageId);

  const doMove = async (leadId, newStageId, closeReason, closeNote) => {
    const prev = leads.find((l) => l.id === leadId)?.stage_id;
    setLeads((ls) =>
      ls.map((l) => (l.id === leadId ? { ...l, stage_id: newStageId } : l)),
    );
    try {
      await moveLead(leadId, newStageId, closeReason, closeNote);
    } catch {
      setLeads((ls) =>
        ls.map((l) => (l.id === leadId ? { ...l, stage_id: prev } : l)),
      );
    }
  };

  const handleDragEnd = (result) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const leadId = parseInt(draggableId);
    const newStageId = parseInt(destination.droppableId);
    const targetStage = stages.find((s) => s.id === newStageId);
    if (targetStage?.name === "Won" || targetStage?.name === "Lost") {
      setPendingMove({
        leadId,
        newStageId,
        targetStage,
        lead: leads.find((l) => l.id === leadId),
      });
      return;
    }
    doMove(leadId, newStageId);
  };

  const handleDelete = async (leadId) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setConfirmId(null);
    try {
      await deleteLead(leadId);
    } catch {}
  };

  const handleCreated = (lead) => setLeads((prev) => [...prev, lead]);
  const handleUpdated = (lead) =>
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));

  if (loading)
    return (
      <div className="p-8 text-sm text-gray-400 dark:text-gray-500">
        Loading pipeline...
      </div>
    );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Pipeline
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {leads.length} leads · drag to move between stages
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => {
            setActiveStage(stages[0]?.id);
            setShowModal(true);
          }}
        >
          <Plus size={14} /> <span className="hidden sm:inline">Add lead</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 px-5 scrollbar-visible">
          {stages.map((stage) => {
            const stageLeads = leadsByStage(stage.id);
            const stageValue = stageLeads.reduce(
              (sum, l) => sum + (l.value || 0),
              0,
            );
            return (
              <div key={stage.id} className="flex-shrink-0 w-80">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {stage.name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>
                  <button
                    className="text-gray-400 dark:text-gray-500 hover:text-brand-600 transition-colors"
                    onClick={() => {
                      setActiveStage(stage.id);
                      setShowModal(true);
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {stageValue > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
                    <DollarSign size={10} />
                    {formatIDR(stageValue)}
                  </p>
                )}
                <Droppable droppableId={String(stage.id)}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-24 rounded-xl space-y-2 p-2 transition-colors ${
                        snapshot.isDraggingOver
                          ? "bg-brand-50 dark:bg-brand-900/20"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      {stageLeads.map((lead, index) => (
                        <Draggable
                          key={lead.id}
                          draggableId={String(lead.id)}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white dark:bg-gray-700 rounded-lg border p-3 text-xs shadow-sm cursor-pointer transition-all ${
                                snapshot.isDragging
                                  ? "shadow-md border-brand-300 dark:border-brand-600"
                                  : "border-gray-200 dark:border-gray-600 hover:border-brand-200 dark:hover:border-brand-700 hover:shadow"
                              }`}
                              onClick={() => setDetailLeadId(lead.id)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-gray-900 dark:text-white leading-snug">
                                  {lead.title}
                                </p>
                                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                                  <AgingBadge lead={lead} />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingLead(lead);
                                    }}
                                    className="text-gray-300 dark:text-gray-500 hover:text-brand-500 transition-colors"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmId(lead.id);
                                    }}
                                    className="text-gray-300 dark:text-gray-500 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              {lead.value > 0 && (
                                <p className="text-gray-400 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                                  <DollarSign size={10} />
                                  {formatIDR(lead.value)}
                                </p>
                              )}
                              {lead.contact?.name && (
                                <p className="text-gray-400 dark:text-gray-400 mt-1">
                                  {lead.contact.name}
                                </p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {stageLeads.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                          Drop leads here
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {showModal && (
        <AddLeadModal
          stageId={activeStage}
          stages={stages}
          contacts={contacts}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          stages={stages}
          contacts={contacts}
          onClose={() => setEditingLead(null)}
          onUpdated={handleUpdated}
        />
      )}
      {pendingMove && (
        <CloseReasonModal
          lead={pendingMove.lead}
          targetStage={pendingMove.targetStage}
          onConfirm={(reason, note) => {
            const { leadId, newStageId } = pendingMove;
            setPendingMove(null);
            doMove(leadId, newStageId, reason, note);
          }}
          onCancel={() => setPendingMove(null)}
        />
      )}
      {detailLeadId && (
        <LeadDetailPanel
          leadId={detailLeadId}
          onClose={() => setDetailLeadId(null)}
          onUpdated={handleUpdated}
        />
      )}
      {confirmId && (
        <ConfirmModal
          message="Lead will be permanently deleted."
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
