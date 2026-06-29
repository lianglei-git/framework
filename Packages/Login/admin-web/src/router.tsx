import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import AdminLayout from './layouts/AdminLayout'
import { RequireAdmin } from './auth/RequireAdmin'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/users/UsersPage'
import UserDetailPage from './pages/users/UserDetailPage'
import LoginLogsPage from './pages/logs/LoginLogsPage'
import SSOClientsPage from './pages/sso/SSOClientsPage'
import SubProjectsPage from './pages/sso/SubProjectsPage'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'))

const AuthLoading = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    }}
  >
    <Spin size="large" />
  </div>
)

export default function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<AuthLoading />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/forbidden"
        element={
          <Suspense fallback={<AuthLoading />}>
            <ForbiddenPage />
          </Suspense>
        }
      />
      <Route
        path="/"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="logs/login" element={<LoginLogsPage />} />
        <Route path="sso/clients" element={<SSOClientsPage />} />
        <Route path="sso/subprojects" element={<SubProjectsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
