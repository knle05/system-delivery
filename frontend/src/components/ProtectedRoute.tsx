import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Props = { children: ReactNode; requiredRole?: 'admin' | 'customer' }

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const auth = useAuth()
  const location = useLocation()
  const userRole = auth.user?.role

  if (!auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && userRole !== requiredRole) {
    // không đủ quyền -> chuyển về trang chính (hoặc hiển thị 403)
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}