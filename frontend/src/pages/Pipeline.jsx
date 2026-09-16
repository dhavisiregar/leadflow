import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  getLeads,
  getStages,
  getLead,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  moveLead,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  addLeadService,
  removeLeadService,
} from "../api";
import {
  Plus,
  Trash2,
  DollarSign,
  X,
  User as UserIcon,
  Kanban,
  List as ListIcon,
  Search,
  Pencil,
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";

const CLOSE_REASONS = [
  "Price",
  "Timeline",
  "Competition",
  "No Budget",
  "Wrong Fit",
  "Other",
];

const SOURCE_OPTIONS = ["Referral", "Website", "Cold Outreach", "Event", "Other"];

const STATUS_LABELS = {
  active: "Active",
  on_hold: "On Hold",
  won: "Won",
  lost: "Lost",
};

const STATUS_COLORS = {
  active: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  on_hold: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  won: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  lost: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

function matchesSearch(lead, search) {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return (
    lead.title?.toLowerCase().includes(q) ||
    lead.company?.toLowerCase().includes(q) ||
    (lead.services || []).some((s) => s.name?.toLowerCase().includes(q))
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${STATUS_COLORS[status] || STATUS_COLORS.active}`}
    >
      {STATUS_LABELS[status] || status}
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

function StatCard({ label, value, tone }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-lg font-semibold ${tone || "text-gray-900 dark:text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function CloseReasonModal({ label, isWon, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Mark as {label}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>
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
            Confirm {label}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddLeadModal({ stageId, onClose, onCreated }) {
  const [form, setForm] = useState({
    company: "",
    title: "",
    lead_type: "new",
    source: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.company.trim()) return setError("Company is required");
    if (!form.title.trim()) return setError("Project name is required");
    setLoading(true);
    try {
      const res = await createLead({
        ...form,
        stage_id: stageId,
        status: "active",
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
              Company *
            </label>
            <input
              className="input"
              placeholder="e.g. PT Maju Jaya"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project name *
            </label>
            <input
              className="input"
              placeholder="e.g. Company website redesign"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                New / Existing
              </label>
              <select
                className="input"
                value={form.lead_type}
                onChange={(e) => setForm({ ...form, lead_type: e.target.value })}
              >
                <option value="new">New</option>
                <option value="existing">Existing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source of lead
              </label>
              <select
                className="input"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="">— Select —</option>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
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

// The BRD's "Edit lead": company/project info, status & pipeline stage,
// products & services (locked until Quotation), and notes & updates.
function LeadPanel({ leadId, stages, onClose, onUpdated, onDeleted }) {
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [svcName, setSvcName] = useState("");
  const [svcValue, setSvcValue] = useState("");
  const [svcSubmitting, setSvcSubmitting] = useState(false);

  const [actNote, setActNote] = useState("");
  const [actSubmitting, setActSubmitting] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [confirmDeleteActivityId, setConfirmDeleteActivityId] = useState(null);

  const [pendingStatus, setPendingStatus] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    Promise.all([getLead(leadId), getActivities(leadId)])
      .then(([lr, ar]) => {
        setLead(lr.data);
        setForm({
          company: lr.data.company || "",
          title: lr.data.title || "",
          lead_type: lr.data.lead_type || "new",
          source: lr.data.source || "",
          stage_id: lr.data.stage_id,
        });
        setActivities(ar.data);
      })
      .finally(() => setLoading(false));
  }, [leadId]);

  const quotationStage = stages.find((s) => s.name === "Quotation");
  const currentDraftStage = stages.find((s) => s.id === parseInt(form?.stage_id));
  const servicesUnlocked =
    !quotationStage || (currentDraftStage && currentDraftStage.order >= quotationStage.order);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await updateLead(lead.id, {
        company: form.company,
        title: form.title,
        lead_type: form.lead_type,
        source: form.source,
        stage_id: parseInt(form.stage_id),
      });
      setLead(res.data);
      onUpdated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save lead");
    } finally {
      setSaving(false);
    }
  };

  const applyStatus = async (status, reason = "", note = "") => {
    const res = await updateLeadStatus(lead.id, status, reason, note);
    const updatedLead = { ...lead, status: res.data.status, close_reason: reason, close_note: note };
    setLead(updatedLead);
    onUpdated(updatedLead);
  };

  const handleStatusChange = (status) => {
    if (status === "won" || status === "lost") {
      setPendingStatus(status);
    } else {
      applyStatus(status);
    }
  };

  const handleAddService = async () => {
    if (!svcName.trim()) return;
    setSvcSubmitting(true);
    try {
      const res = await addLeadService(lead.id, {
        name: svcName,
        value: parseFloat(svcValue) || 0,
      });
      setLead(res.data);
      onUpdated(res.data);
      setSvcName("");
      setSvcValue("");
    } finally {
      setSvcSubmitting(false);
    }
  };

  const handleRemoveService = async (serviceId) => {
    const res = await removeLeadService(lead.id, serviceId);
    setLead(res.data);
    onUpdated(res.data);
  };

  const handleAddActivity = async () => {
    if (!actNote.trim()) return;
    setActSubmitting(true);
    try {
      const res = await createActivity(leadId, actNote);
      setActivities((prev) => [res.data, ...prev]);
      setActNote("");
    } finally {
      setActSubmitting(false);
    }
  };

  const handleUpdateActivity = async (activityId) => {
    if (!editingActivity.note.trim()) return;
    setActSubmitting(true);
    try {
      const res = await updateActivity(leadId, activityId, editingActivity.note);
      setActivities((prev) => prev.map((a) => (a.id === activityId ? res.data : a)));
      setEditingActivity(null);
    } finally {
      setActSubmitting(false);
    }
  };

  const confirmDeleteActivity = async () => {
    await deleteActivity(leadId, confirmDeleteActivityId);
    setActivities((prev) => prev.filter((a) => a.id !== confirmDeleteActivityId));
    setConfirmDeleteActivityId(null);
  };

  const totalServiceValue = (lead?.services || []).reduce((s, x) => s + (x.value || 0), 0);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Edit Lead
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
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
                {error}
              </div>
            )}

            {lead.owner?.name && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <UserIcon size={12} /> Owner: {lead.owner.name}
              </p>
            )}

            {/* Lead info */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Lead info</p>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Company</label>
                <input
                  className="input"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Project name</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">New / Existing</label>
                  <select
                    className="input"
                    value={form.lead_type}
                    onChange={(e) => setForm({ ...form, lead_type: e.target.value })}
                  >
                    <option value="new">New</option>
                    <option value="existing">Existing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Source of lead</label>
                  <select
                    className="input"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {SOURCE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pipeline */}
            <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Pipeline</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select
                    className="input"
                    value={lead.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Pipeline stage</label>
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
              {(lead.status === "won" || lead.status === "lost") && lead.close_reason && (
                <div
                  className={`rounded-lg p-3 text-xs ${
                    lead.status === "won"
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800"
                  }`}
                >
                  <p className="font-medium text-gray-700 dark:text-gray-200">
                    {lead.status === "won" ? "Win reason" : "Loss reason"}: {lead.close_reason}
                  </p>
                  {lead.close_note && (
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">{lead.close_note}</p>
                  )}
                </div>
              )}
            </div>

            {/* Products & services */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Products & services
              </p>
              {!servicesUnlocked ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                  Available once the lead reaches the Quotation stage.
                </p>
              ) : (
                <>
                  {(lead.services || []).length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                      No services added yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 mb-2">
                      {lead.services.map((svc) => (
                        <div
                          key={svc.id}
                          className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/50 rounded px-2.5 py-1.5"
                        >
                          <span className="text-gray-700 dark:text-gray-200">{svc.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">
                              {formatIDR(svc.value) || "IDR 0"}
                            </span>
                            <button
                              onClick={() => handleRemoveService(svc.id)}
                              className="text-gray-300 dark:text-gray-500 hover:text-red-400"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <input
                      className="input text-xs flex-1"
                      placeholder="Service or product name"
                      value={svcName}
                      onChange={(e) => setSvcName(e.target.value)}
                    />
                    <input
                      className="input text-xs w-24"
                      type="number"
                      placeholder="Value"
                      value={svcValue}
                      onChange={(e) => setSvcValue(e.target.value)}
                    />
                    <button
                      className="btn-primary text-xs px-3"
                      onClick={handleAddService}
                      disabled={svcSubmitting || !svcName.trim()}
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                    Total deal value:{" "}
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {formatIDR(totalServiceValue) || "IDR 0"}
                    </span>
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
              <button className="btn-secondary flex-1" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

            {/* Notes & updates */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 pb-4">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                Notes & updates
                {activities.length > 0 && (
                  <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
                    ({activities.length})
                  </span>
                )}
              </p>
              <textarea
                className="input resize-none w-full mb-2 text-xs"
                rows={2}
                placeholder="Add a note for the team..."
                value={actNote}
                onChange={(e) => setActNote(e.target.value)}
              />
              <button
                className="btn-primary w-full text-xs mb-4"
                onClick={handleAddActivity}
                disabled={actSubmitting || !actNote.trim()}
              >
                {actSubmitting ? "Saving..." : "Add note"}
              </button>

              {activities.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                  No notes yet — add the first one above
                </p>
              ) : (
                <div className="space-y-3">
                  {activities.map((act) => {
                    const isEditing = editingActivity?.id === act.id;
                    return (
                      <div
                        key={act.id}
                        className={`group ${isEditing ? "bg-gray-50 dark:bg-gray-700/50 p-3 rounded" : ""}`}
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              className="input text-xs"
                              rows={2}
                              value={editingActivity.note}
                              onChange={(e) =>
                                setEditingActivity({ ...editingActivity, note: e.target.value })
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
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-gray-800 dark:text-gray-200 leading-snug">{act.note}</p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                {act.created_by?.name} ·{" "}
                                {new Date(act.created_at).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingActivity(act)}
                                className="text-gray-400 dark:text-gray-500 hover:text-brand-500 transition-colors p-0.5"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteActivityId(act.id)}
                                className="text-gray-400 dark:text-gray-500 hover:text-red-400 transition-colors p-0.5"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              className="text-xs text-red-500 hover:text-red-600 font-medium"
              onClick={() => setConfirmDelete(true)}
            >
              Delete lead
            </button>
          </div>
        )}

        {pendingStatus && (
          <CloseReasonModal
            label={STATUS_LABELS[pendingStatus]}
            isWon={pendingStatus === "won"}
            onConfirm={(reason, note) => {
              applyStatus(pendingStatus, reason, note);
              setPendingStatus(null);
            }}
            onCancel={() => setPendingStatus(null)}
          />
        )}
        {confirmDelete && (
          <ConfirmModal
            message="Lead will be permanently deleted."
            onConfirm={async () => {
              await deleteLead(lead.id);
              setConfirmDelete(false);
              onDeleted(lead.id);
              onClose();
            }}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
        {confirmDeleteActivityId && (
          <ConfirmModal
            message="Note will be permanently deleted."
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeStage, setActiveStage] = useState(null);
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const [view, setView] = useState("board");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    Promise.all([getLeads(), getStages()])
      .then(([leadsRes, stagesRes]) => {
        setLeads(leadsRes.data);
        setStages(stagesRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeLeads = useMemo(() => leads.filter((l) => l.status === "active"), [leads]);
  const wonLeads = useMemo(() => leads.filter((l) => l.status === "won"), [leads]);
  const lostLeads = useMemo(() => leads.filter((l) => l.status === "lost"), [leads]);
  const activeValue = useMemo(
    () => activeLeads.reduce((s, l) => s + (l.value || 0), 0),
    [activeLeads],
  );
  const wonValue = useMemo(() => wonLeads.reduce((s, l) => s + (l.value || 0), 0), [wonLeads]);

  const tableLeads = useMemo(() => {
    return leads
      .filter((l) => (statusFilter === "all" ? true : l.status === statusFilter))
      .filter((l) => matchesSearch(l, search));
  }, [leads, statusFilter, search]);

  const leadsByStage = (stageId) =>
    activeLeads.filter((l) => l.stage_id === stageId).filter((l) => matchesSearch(l, search));

  const doMove = async (leadId, newStageId) => {
    const prev = leads.find((l) => l.id === leadId)?.stage_id;
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, stage_id: newStageId } : l)));
    try {
      await moveLead(leadId, newStageId);
    } catch {
      setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, stage_id: prev } : l)));
    }
  };

  const handleDragEnd = (result) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const leadId = parseInt(draggableId);
    const newStageId = parseInt(destination.droppableId);
    doMove(leadId, newStageId);
  };

  const handleDelete = async (leadId) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setConfirmId(null);
    try {
      await deleteLead(leadId);
    } catch (err) {
      console.error("Failed to delete lead", err);
    }
  };

  const handleCreated = (lead) => setLeads((prev) => [...prev, lead]);
  const handleUpdated = (lead) =>
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));
  const handleDeletedFromPanel = (leadId) =>
    setLeads((prev) => prev.filter((l) => l.id !== leadId));

  if (loading)
    return (
      <div className="p-8 text-sm text-gray-400 dark:text-gray-500">Loading pipeline...</div>
    );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Pipeline</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{leads.length} leads</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "board"
                  ? "bg-brand-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              <Kanban size={13} /> Board
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "table"
                  ? "bg-brand-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              <ListIcon size={13} /> Table
            </button>
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
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active leads" value={activeLeads.length} />
        <StatCard label="Active deal value" value={formatIDR(activeValue) || "IDR 0"} />
        <StatCard label="Won value" value={formatIDR(wonValue) || "IDR 0"} tone="text-green-600 dark:text-green-400" />
        <StatCard label="Lost" value={lostLeads.length} tone="text-red-500 dark:text-red-400" />
      </div>

      {/* Search + status filter */}
      <div className="flex flex-wrap items-center gap-2 mb-5 px-1">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            className="input pl-8"
            placeholder="Search company, project, services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {view === "table" && (
          <select
            className="input w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      {view === "board" ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 px-1 scrollbar-visible">
            {stages.map((stage) => {
              const stageLeads = leadsByStage(stage.id);
              const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);
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
                          <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
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
                                  <div>
                                    {lead.company && (
                                      <p className="text-gray-400 dark:text-gray-500 text-[10px] mb-0.5">
                                        {lead.company}
                                      </p>
                                    )}
                                    <p className="font-medium text-gray-900 dark:text-white leading-snug">
                                      {lead.title}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmId(lead.id);
                                    }}
                                    className="text-gray-300 dark:text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                {lead.value > 0 && (
                                  <p className="text-gray-400 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                                    <DollarSign size={10} />
                                    {formatIDR(lead.value)}
                                  </p>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stageLeads.length === 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                            No active leads
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
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Project name</th>
                <th className="px-4 py-2.5 font-medium">Services</th>
                <th className="px-4 py-2.5 font-medium">New/Existing</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                <th className="px-4 py-2.5 font-medium text-right">Deal value</th>
              </tr>
            </thead>
            <tbody>
              {tableLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                  onClick={() => setDetailLeadId(lead.id)}
                >
                  <td className="px-4 py-2.5">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-200">
                    {lead.company || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900 dark:text-white font-medium">
                    {lead.title}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                    {lead.services?.length ? `${lead.services.length} service(s)` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 capitalize">
                    {lead.lead_type || "new"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                    {lead.source || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                    {lead.stage?.name}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-200">
                    {formatIDR(lead.value) || "—"}
                  </td>
                </tr>
              ))}
              {tableLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">
                    No leads match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddLeadModal
          stageId={activeStage}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
      {detailLeadId && (
        <LeadPanel
          leadId={detailLeadId}
          stages={stages}
          onClose={() => setDetailLeadId(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeletedFromPanel}
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
