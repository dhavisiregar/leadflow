import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Pipeline from './pages/Pipeline'
import Analytics from './pages/Analytics'
import TeamMembers from './pages/TeamMembers'

const OBSERVER_ROLES = ['unit_head', 'manager', 'data_analyst']

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/" replace /> : children
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth()
  return roles.includes(user?.role) ? children : <Navigate to="/" replace />
}

// "My Pipeline" for Sales/Owner (the BRD's Eksekutor Operasional); the
// read-only analytics Dashboard for Unit Head/Manager/Data Analyst (Observer).
function Home() {
  const { user } = useAuth()
  return OBSERVER_ROLES.includes(user?.role) ? <Analytics /> : <Pipeline />
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Home />} />
            <Route
              path="team-members"
              element={
                <RoleRoute roles={['owner']}>
                  <TeamMembers />
                </RoleRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}
