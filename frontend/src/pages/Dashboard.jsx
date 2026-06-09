import { useEffect, useState } from 'react'
import { getStats } from '../api'
import { TrendingUp, Users, DollarSign, Activity, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats()
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false))
  }, [])

  const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">
          Good day, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's what's happening in your pipeline.</p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading stats...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Total Leads"
              value={stats?.total_leads ?? 0}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              icon={DollarSign}
              label="Pipeline Value"
              value={formatCurrency(stats?.pipeline_value ?? 0)}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              icon={TrendingUp}
              label="Won Leads"
              value={stats?.won_count ?? 0}
              sub={`${(stats?.conversion_rate ?? 0).toFixed(1)}% conversion`}
              color="bg-purple-50 text-purple-600"
            />
            <StatCard
              icon={Activity}
              label="Activities This Month"
              value={stats?.activities_this_month ?? 0}
              color="bg-orange-50 text-orange-600"
            />
          </div>

          {/* Pipeline breakdown */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Pipeline Breakdown</h2>
              <Link to="/pipeline" className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                Open pipeline <ArrowRight size={12} />
              </Link>
            </div>

            {stats?.leads_by_stage?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No leads yet.{' '}
                <Link to="/pipeline" className="text-brand-600 hover:underline">Add your first lead →</Link>
              </p>
            ) : (
              <div className="space-y-3">
                {stats?.leads_by_stage?.map((s) => {
                  const pct = stats.total_leads > 0 ? (s.count / stats.total_leads) * 100 : 0
                  return (
                    <div key={s.stage_name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="font-medium text-gray-700">{s.stage_name}</span>
                        </div>
                        <span className="text-gray-500">{s.count} leads · {formatCurrency(s.value)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
