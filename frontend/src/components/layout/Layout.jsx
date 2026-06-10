import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Kanban, Users, LogOut, Zap, CreditCard } from 'lucide-react'
import { getPlan } from '../../api'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [planData, setPlanData] = useState(null)

  useEffect(() => {
    getPlan().then((res) => setPlanData(res.data)).catch(() => {})
  }, [])

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">LeadFlow</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Plan usage + user */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-3">
          {planData && planData.limits?.MaxLeads > 0 && (
            <div className="px-3">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Leads</span>
                <span>{planData.leads_count}/{planData.limits.MaxLeads}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1">
                <div
                  className={`h-1 rounded-full ${
                    (planData.leads_count / planData.limits.MaxLeads) >= 0.9 ? 'bg-red-400' : 'bg-brand-500'
                  }`}
                  style={{ width: `${Math.min((planData.leads_count / planData.limits.MaxLeads) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize truncate">{planData?.plan || user?.tenant?.plan || 'free'} plan</p>
            </div>
            <button onClick={handleSignOut} className="text-gray-400 hover:text-gray-600 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
