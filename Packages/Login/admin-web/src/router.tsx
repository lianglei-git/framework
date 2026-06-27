import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import AdminLayout from './layouts/AdminLayout'
import { RequireAdmin } from './auth/RequireAdmin'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const UsersPage = lazy(() => import('./pages/users/UsersPage'))
const UserDetailPage = lazy(() => import('./pages/users/UserDetailPage'))
const LoginLogsPage = lazy(() => import('./pages/logs/LoginLogsPage'))
const SSOClientsPage = lazy(() => import('./pages/sso/SSOClientsPage'))

const Loading = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
    }}
  >
    <Spin size="large" />
  </div>
)

export default function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
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
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
