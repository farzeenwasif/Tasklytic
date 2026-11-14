import { Navigate, Route, Routes } from 'react-router'
import Landing from '../pages/Landing'
import Dashboard from '../pages/Dashboard'
import TasksManagement from '../pages/TasksManagement'
import AddTask from '../pages/AddTask'
import Profile from '../pages/Profile'
import Login from '../pages/Login'
import Signup from '../pages/Signup'
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute'

export default function Router() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<Landing/>} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login/>} />
        <Route path="/signup" element={<Signup/>} />
        <Route path="/forgot-password" element={<ForgotPassword/>} />
      </Route>

      {/* Opened from the email link: works whether or not you are logged in */}
      <Route path="/reset-password/:token" element={<ResetPassword/>} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/tasks" element={<TasksManagement/>} />
        <Route path="/tasks/add" element={<AddTask/>} />
        <Route path="/profile" element={<Profile/>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
