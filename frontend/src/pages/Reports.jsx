import { useEffect, useState } from 'react'
import { getReportSummary } from '../api'
import { useTheme } from '../context/ThemeContext'
import { BarChart2, TrendingUp, Target, Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const RANGES = [
  { label: '30 hari', days: 30 },
  { label: '3 bulan', days: 90 },
  { label: '6 bulan', days: 180 },
  { label: 'Tahun ini', days: 365 },
]

function formatIDR(val) {
  if (!val) return 'Rp 0'
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`
  return `Rp ${val}`
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <Icon size={16} className={color} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Reports() {
  const { dark } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)

  useEffect(() => {
    setLoading(true)
    getReportSummary(days)
      .then(res => setData(res.data))
      .finally(() => setLoading(false))
  }, [days])

  const hasData = data?.total_won > 0 || (data?.leads_created_by_month?.length ?? 0) > 0

  const gridColor = dark ? '#374151' : '#f3f4f6'
  const tickColor = dark ? '#6b7280' : '#9ca3af'
  const tooltipStyle = dark
    ? { fontSize: 11, borderRadius: 8, border: '1px solid #374151', background: '#1f2937', color: '#f9fafb', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }
    : { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }

  return (
    <div className="p-4 sm:p-8 w-full">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Analitik pipeline kamu</p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`text-xs font-medium px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                days === r.days
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500">Loading reports...</div>
      ) : !hasData ? (
        <div className="card p-16 text-center">
          <BarChart2 size={48} className="mx-auto text-gray-200 dark:text-gray-600 mb-4" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada data</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Close your first deal to see reports</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Won"
              value={data.total_won}
              sub="deals closed"
              icon={Target}
              color="text-green-500"
            />
            <StatCard
              label="Total Revenue"
              value={formatIDR(data.total_revenue)}
              sub="dari won deals"
              icon={TrendingUp}
              color="text-brand-600"
            />
            <StatCard
              label="Avg Deal Value"
              value={formatIDR(data.avg_deal_value)}
              sub="per won deal"
              icon={BarChart2}
              color="text-purple-500"
            />
            <StatCard
              label="Avg Days to Close"
              value={data.avg_days_to_close ? `${Math.round(data.avg_days_to_close)}d` : '—'}
              sub="created → won"
              icon={Clock}
              color="text-yellow-500"
            />
          </div>

          {/* Leads created chart */}
          {data.leads_created_by_month?.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Leads Created per Month</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.leads_created_by_month} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Leads']} />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue won chart */}
          {data.revenue_won_by_month?.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Revenue Won per Month</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.revenue_won_by_month} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v >= 1_000_000 ? `${v / 1_000_000}jt` : `${v / 1_000}rb`}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatIDR(v), 'Revenue']} />
                  <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top close reasons */}
          {data.top_close_reasons?.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Top Close Reasons</h2>
              <div className="space-y-3">
                {data.top_close_reasons.map((r, i) => {
                  const max = data.top_close_reasons[0].count
                  const pct = Math.round((r.count / max) * 100)
                  return (
                    <div key={r.reason} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-4 text-right flex-shrink-0">{i + 1}</span>
                      <span className="text-xs text-gray-700 dark:text-gray-200 w-28 truncate flex-shrink-0">{r.reason}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-brand-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-6 text-right flex-shrink-0">{r.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
