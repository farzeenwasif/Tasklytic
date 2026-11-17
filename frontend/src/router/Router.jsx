import { Navigate, Route, Routes } from 'react-router'
import Landing from '../pages/Landing'
import Dashboard from '../pages/Dashboard'
import TasksManagement from '../pages/TasksManagement'
import AddTask from '../pages/AddTask'
import Profile from '../pages/Profile'
import Billing from '../pages/Billing'
import Plan from '../pages/Plan'
import Finance from '../pages/Finance'
import Help from '../pages/Help'
import Login from '../pages/Login'
import Signup from '../pages/Signup'
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute'
import RouteMeta from './RouteMeta'

export default function Router() {
  return (
    <>
    <RouteMeta />
    <Routes>
      {/* Logged-out only: logged-in users are sent to /dashboard until they sign out */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<Landing/>} />
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
        <Route path="/billing" element={<Billing/>} />
        <Route path="/today" element={<Plan/>} />
        <Route path="/finance" element={<Finance/>} />
        <Route path="/help" element={<Help/>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
