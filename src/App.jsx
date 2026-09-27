import FloatingStudyClock from './components/FloatingStudyClock'
import { useAuth } from './context/AuthContext'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Signup from './pages/Signup'

import LandingEditorial from './pages/LandingEditorial'
import Dashboard from './pages/Dashboard'
import WeekView from './pages/WeekView'
import GoalDetail from './pages/GoalDetail'
import Performance from './pages/Performance'
import Syllabus from './pages/Syllabus'
import Profile from './pages/Profile'
import MentorPanel from './pages/MentorPanel'
import MentorOverview from './pages/MentorOverview'
import Students from './pages/Students'
import Resources from './pages/Resources'
import GoalCatalog from './pages/GoalCatalog'
import WeekPacks from './pages/WeekPacks'
import { Avatar } from './components/WorkspaceUI'
import { Link } from 'react-router-dom'

function Layout({ children }) {
  const { profile } = useAuth()
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content"><header className="topbar"><span>Seu próximo passo começa aqui.</span><Link to="/perfil" className="profile-link"><Avatar name={profile?.full_name}/><div><strong>{profile?.full_name || 'Minha conta'}</strong><small>{profile?.role === 'mentor' ? 'Professor' : 'Aluno'}</small></div><span>⌄</span></Link></header><main className="workspace">{children}</main></div>
    </div>
  )
}

function StudentPage({ children }) {
 const { profile } = useAuth()
 return profile?.role === 'mentor' ? <Navigate to='/mentor' replace /> : children
}

export default function App() {
  const { session, loading, profile } = useAuth()
  return (
    <><Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Signup />} />
      <Route path="/apresentacao" element={<LandingEditorial />} />
      <Route path="/apresentacao-v2" element={<LandingEditorial />} />

      <Route
        path="/"
        element={
          !session && !loading ? <LandingEditorial /> : <ProtectedRoute>
            <Layout>
              <StudentPage><Dashboard /></StudentPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/semana"
        element={
          <ProtectedRoute>
            <Layout>
              <StudentPage><WeekView /></StudentPage>
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
              <StudentPage><Performance /></StudentPage>
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
              <MentorOverview />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/mentor/catalogo" element={<ProtectedRoute requireRole="mentor"><Layout><GoalCatalog /></Layout></ProtectedRoute>} />
      <Route path="/mentor/pacotes" element={<ProtectedRoute requireRole="mentor"><Layout><WeekPacks /></Layout></ProtectedRoute>} />
      <Route path="/mentor/alunos" element={<ProtectedRoute requireRole="mentor"><Layout><Students /></Layout></ProtectedRoute>} />
      <Route path="/mentor/metas" element={<ProtectedRoute requireRole="mentor"><Layout><MentorPanel /></Layout></ProtectedRoute>} />
      <Route path="/mentor/relatorios" element={<Navigate to="/mentor" replace/>} />
      <Route path="/edital" element={<ProtectedRoute><Layout><Syllabus/></Layout></ProtectedRoute>} />
      <Route path="/encontros" element={<ProtectedRoute><Layout><Resources type="meetings" /></Layout></ProtectedRoute>} />
      <Route path="/materiais" element={<ProtectedRoute><Layout><StudentPage><Resources type="materials" /></StudentPage></Layout></ProtectedRoute>} />
      <Route path="/estudos" element={<ProtectedRoute><Layout><StudentPage><Resources type="study" /></StudentPage></Layout></ProtectedRoute>} />
    </Routes>{session && profile?.role === 'student' && <FloatingStudyClock key={session.user.id} userId={session.user.id}/>}</>
  )
}
