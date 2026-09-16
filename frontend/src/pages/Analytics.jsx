import { useEffect, useState } from "react";
import { getAnalytics } from "../api";
import { Users, DollarSign, TrendingUp, XCircle } from "lucide-react";

function formatIDR(val) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sales_id: "",
    team_id: "",
    status: "",
    date_from: "",
    date_to: "",
  });

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== ""),
    );
    getAnalytics(params)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Read-only view of your team's pipeline performance.
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sales rep</label>
          <select
            className="input w-40"
            value={filters.sales_id}
            onChange={(e) => setFilters({ ...filters, sales_id: e.target.value })}
          >
            <option value="">All</option>
            {(data?.scope_sales_reps || []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        {data?.scope_teams?.length > 0 && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Team</label>
            <select
              className="input w-40"
              value={filters.team_id}
              onChange={(e) => setFilters({ ...filters, team_id: e.target.value })}
            >
              <option value="">All</option>
              {data.scope_teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
          <select
            className="input w-36"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
          <input
            type="date"
            className="input w-36"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
          <input
            type="date"
            className="input w-36"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500">Loading analytics...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Active Lead Count"
              value={data?.active_lead_count ?? 0}
              color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={DollarSign}
              label="Active Deal Value"
              value={formatIDR(data?.active_deal_value)}
              color="bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Won Value"
              value={formatIDR(data?.won_value)}
              color="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
            />
            <StatCard
              icon={XCircle}
              label="Lost Count"
              value={data?.lost_count ?? 0}
              color="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Breakdown by sales rep
              </h2>
              {!data?.by_sales_rep?.length ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                  No data for this filter.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="py-2 font-medium">Sales rep</th>
                        <th className="py-2 font-medium text-right">Active</th>
                        <th className="py-2 font-medium text-right">Active value</th>
                        <th className="py-2 font-medium text-right">Won value</th>
                        <th className="py-2 font-medium text-right">Lost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_sales_rep.map((r) => (
                        <tr key={r.user_id} className="border-b border-gray-50 dark:border-gray-700/50">
                          <td className="py-2 text-gray-800 dark:text-gray-200">{r.name}</td>
                          <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                            {r.active_count}
                          </td>
                          <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                            {formatIDR(r.active_value)}
                          </td>
                          <td className="py-2 text-right text-green-600 dark:text-green-400">
                            {formatIDR(r.won_value)}
                          </td>
                          <td className="py-2 text-right text-red-500 dark:text-red-400">
                            {r.lost_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Breakdown by team
              </h2>
              {!data?.by_team?.length ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                  No team data for this filter.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="py-2 font-medium">Team</th>
                        <th className="py-2 font-medium text-right">Active</th>
                        <th className="py-2 font-medium text-right">Active value</th>
                        <th className="py-2 font-medium text-right">Won value</th>
                        <th className="py-2 font-medium text-right">Lost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_team.map((t) => (
                        <tr key={t.team_id} className="border-b border-gray-50 dark:border-gray-700/50">
                          <td className="py-2 text-gray-800 dark:text-gray-200">{t.team_name}</td>
                          <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                            {t.active_count}
                          </td>
                          <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                            {formatIDR(t.active_value)}
                          </td>
                          <td className="py-2 text-right text-green-600 dark:text-green-400">
                            {formatIDR(t.won_value)}
                          </td>
                          <td className="py-2 text-right text-red-500 dark:text-red-400">
                            {t.lost_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
