import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import AppLayout from './layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard.jsx'
import Admissions from './pages/Admissions'
import Reports from './pages/Reports'
import BedBoard from "./pages/BedBoard"
import Notifications from './pages/Notifications'
import Orders from './pages/Orders'
import Complaints from './pages/Complaints'
import Patients from './pages/Patients'
import Users from './pages/Users'
import LinkAccess from './pages/LinkAccess'

function Shell({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Navigate to="/dashboard" replace /></Shell>} />
      <Route path="/dashboard" element={<Shell><Dashboard /></Shell>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admissions" element={<Shell><Admissions /></Shell>} />
      <Route path="/reports" element={<Shell><Reports /></Shell>} />
      <Route path="/bed-board" element={<Shell><BedBoard /></Shell>} />
      <Route path="/notifications" element={<Shell><Notifications /></Shell>} />
      <Route path="/orders" element={<Shell><Orders /></Shell>} />
      <Route path="/complaints" element={<Shell><Complaints /></Shell>} />
      <Route path="/patients" element={<Shell><Patients /></Shell>} />
      <Route path="/settings" element={<Shell><Users /></Shell>} />
      <Route path="/access" element={<Shell><LinkAccess /></Shell>} />
    </Routes>
  )
}
