import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Role = 'admin' | 'customer' | 'merchant'

type Props = {
  children: ReactNode
  requiredRole?: Role
  requiredRoles?: Role[]
}

export default function ProtectedRoute({ children, requiredRole, requiredRoles }: Props) {
  const { user } = useAuth()
  const location = useLocation()
  const role = user?.role as Role | undefined

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!role || !requiredRoles.includes(role)) return <Navigate to="/" replace />
  } else if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
