import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import WeekView from './pages/WeekView'
import GoalDetail from './pages/GoalDetail'
import ExamHistory from './pages/ExamHistory'
import Profile from './pages/Profile'
import MentorPanel from './pages/MentorPanel'

function Layout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Signup />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/semana"
        element={
          <ProtectedRoute>
            <Layout>
              <WeekView />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/metas/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <GoalDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/provas"
        element={
          <ProtectedRoute>
            <Layout>
              <ExamHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor"
        element={
          <ProtectedRoute requireRole="mentor">
            <Layout>
              <MentorPanel />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
