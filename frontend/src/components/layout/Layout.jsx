import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  LayoutDashboard, Kanban, Users, LogOut, Zap, CreditCard,
  CheckSquare, BarChart2, Menu, X, Sun, Moon, UserPlus,
} from 'lucide-react'
import { getPlan } from '../../api'
import GlobalSearch from './GlobalSearch'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/team', icon: UserPlus, label: 'Team' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [planData, setPlanData] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    getPlan().then(res => setPlanData(res.data)).catch(() => {})
  }, [])

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-56 flex-shrink-0
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          flex flex-col transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">LeadFlow</span>
          </div>
          <button
            className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <Icon size={16} className="flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Plan usage + user */}
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-2 flex-shrink-0">
          {planData && planData.limits?.MaxLeads > 0 && (
            <div className="px-3">
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                <span>Leads</span>
                <span>{planData.leads_count}/{planData.limits.MaxLeads}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1">
                <div
                  className={`h-1 rounded-full ${
                    (planData.leads_count / planData.limits.MaxLeads) >= 0.9 ? 'bg-red-400' : 'bg-brand-500'
                  }`}
                  style={{ width: `${Math.min((planData.leads_count / planData.limits.MaxLeads) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-400 text-xs font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize truncate">
                {planData?.plan || user?.tenant?.plan || 'free'} plan
              </p>
            </div>
            <button
              onClick={toggle}
              title={dark ? 'Light mode' : 'Dark mode'}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-0.5"
            >
              {dark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button
              onClick={handleSignOut}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center flex-shrink-0">
              <Zap size={11} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">LeadFlow</span>
          </div>
          <button
            onClick={toggle}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        {/* Topbar — global search */}
        <div className="flex items-center px-4 sm:px-6 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <GlobalSearch />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
