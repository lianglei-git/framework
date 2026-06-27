import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from './useAdminAuth'

interface Props {
  children: React.ReactNode
}

export function RequireAdmin({ children }: Props) {
  const { user, token } = useAdminAuth()
  const location = useLocation()

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
