import { useEffect, useState } from "react";
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
} from "../api";
import { Plus, X, Trash2, Pencil } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";

const ROLE_LABELS = {
  owner: "Owner",
  sales: "Sales",
  unit_head: "Unit Head",
  manager: "Manager",
  data_analyst: "Data Analyst",
  member: "Member",
};

const ASSIGNABLE_ROLES = ["sales", "unit_head", "manager", "data_analyst"];

function MemberModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "sales" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      return setError("Name, email, and an 8+ character password are required");
    }
    setLoading(true);
    try {
      const res = await createTeamMember(form);
      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create team member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Add team member</h2>
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
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={submit} disabled={loading}>
            {loading ? "Creating..." : "Create member"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamModal({ team, members, onClose, onSaved }) {
  const unitHeads = members.filter((m) => m.role === "unit_head");
  const managers = members.filter((m) => m.role === "manager");
  const salesReps = members.filter((m) => m.role === "sales");

  const [form, setForm] = useState({
    name: team?.name || "",
    manager_id: team?.manager_id || "",
    unit_head_id: team?.unit_head_id || "",
    member_ids: team?.members?.map((m) => m.id) || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleMember = (id) => {
    setForm((f) => ({
      ...f,
      member_ids: f.member_ids.includes(id)
        ? f.member_ids.filter((x) => x !== id)
        : [...f.member_ids, id],
    }));
  };

  const submit = async () => {
    if (!form.name.trim()) return setError("Team name is required");
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        manager_id: form.manager_id ? parseInt(form.manager_id) : null,
        unit_head_id: form.unit_head_id ? parseInt(form.unit_head_id) : null,
        member_ids: form.member_ids,
      };
      const res = team ? await updateTeam(team.id, payload) : await createTeam(payload);
      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {team ? "Edit team" : "New team"}
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
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Team name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Head</label>
            <select className="input" value={form.unit_head_id} onChange={(e) => setForm({ ...form, unit_head_id: e.target.value })}>
              <option value="">— None —</option>
              {unitHeads.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Manager</label>
            <select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
              <option value="">— None —</option>
              {managers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sales members
            </label>
            {salesReps.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">No sales reps yet.</p>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                {salesReps.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={form.member_ids.includes(u.id)}
                      onChange={() => toggleMember(u.id)}
                    />
                    {u.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={submit} disabled={loading}>
            {loading ? "Saving..." : "Save team"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamMembers() {
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [teamModal, setTeamModal] = useState(null); // { team: null|team }
  const [confirmDeleteMember, setConfirmDeleteMember] = useState(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(null);

  const load = () => {
    Promise.all([getTeamMembers(), getTeams()])
      .then(([m, t]) => {
        setMembers(m.data);
        setTeams(t.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRoleChange = async (member, role) => {
    const res = await updateTeamMember(member.id, { role });
    setMembers((prev) => prev.map((m) => (m.id === member.id ? res.data : m)));
  };

  const handleDeleteMember = async () => {
    await deleteTeamMember(confirmDeleteMember.id);
    setMembers((prev) => prev.filter((m) => m.id !== confirmDeleteMember.id));
    setConfirmDeleteMember(null);
  };

  const handleDeleteTeam = async () => {
    await deleteTeam(confirmDeleteTeam.id);
    setTeams((prev) => prev.filter((t) => t.id !== confirmDeleteTeam.id));
    setConfirmDeleteTeam(null);
  };

  if (loading) return <div className="p-8 text-sm text-gray-400 dark:text-gray-500">Loading...</div>;

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Team Members</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage Sales, Unit Head, Manager, and Data Analyst accounts for your organization.
        </p>
      </div>

      {/* Members */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Members</h2>
          <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={() => setShowMemberModal(true)}>
            <Plus size={13} /> Add member
          </button>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No team members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Email</th>
                  <th className="py-2 font-medium">Role</th>
                  <th className="py-2 font-medium">Team</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-2.5 text-gray-800 dark:text-gray-200">{m.name}</td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">{m.email}</td>
                    <td className="py-2.5">
                      {m.role === "owner" ? (
                        <span className="text-gray-500 dark:text-gray-400">Owner</span>
                      ) : (
                        <select
                          className="input py-1 text-xs w-32"
                          value={m.role}
                          onChange={(e) => handleRoleChange(m, e.target.value)}
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">{m.team?.name || "—"}</td>
                    <td className="py-2.5 text-right">
                      {m.role !== "owner" && (
                        <button
                          onClick={() => setConfirmDeleteMember(m)}
                          className="text-gray-300 dark:text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Teams</h2>
          <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={() => setTeamModal({ team: null })}>
            <Plus size={13} /> New team
          </button>
        </div>
        {teams.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No teams yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="py-2 font-medium">Team</th>
                  <th className="py-2 font-medium">Unit Head</th>
                  <th className="py-2 font-medium">Manager</th>
                  <th className="py-2 font-medium">Members</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-2.5 text-gray-800 dark:text-gray-200">{t.name}</td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">{t.unit_head?.name || "—"}</td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">{t.manager?.name || "—"}</td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">{t.members?.length || 0}</td>
                    <td className="py-2.5 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setTeamModal({ team: t })}
                        className="text-gray-300 dark:text-gray-500 hover:text-brand-500 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteTeam(t)}
                        className="text-gray-300 dark:text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showMemberModal && (
        <MemberModal
          onClose={() => setShowMemberModal(false)}
          onSaved={(m) => setMembers((prev) => [...prev, m])}
        />
      )}
      {teamModal && (
        <TeamModal
          team={teamModal.team}
          members={members}
          onClose={() => setTeamModal(null)}
          onSaved={(t) =>
            setTeams((prev) =>
              teamModal.team ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t],
            )
          }
        />
      )}
      {confirmDeleteMember && (
        <ConfirmModal
          message={`${confirmDeleteMember.name} will lose access to this workspace.`}
          onConfirm={handleDeleteMember}
          onCancel={() => setConfirmDeleteMember(null)}
        />
      )}
      {confirmDeleteTeam && (
        <ConfirmModal
          message={`"${confirmDeleteTeam.name}" will be deleted. Members will be unassigned, not deleted.`}
          onConfirm={handleDeleteTeam}
          onCancel={() => setConfirmDeleteTeam(null)}
        />
      )}
    </div>
  );
}
