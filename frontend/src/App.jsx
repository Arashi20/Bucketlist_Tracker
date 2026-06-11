import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import AccountPage from './pages/AccountPage'
import BucketlistPage from './pages/BucketlistPage'
import ScratchMapPage from './pages/ScratchMapPage'
import TripPlannerPage from './pages/TripPlannerPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/"           element={<Navigate to="/account" replace />} />
                <Route path="/account"    element={<AccountPage />} />
                <Route path="/bucketlist" element={<BucketlistPage />} />
                <Route path="/map"        element={<ScratchMapPage />} />
                <Route path="/trips"      element={<TripPlannerPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
