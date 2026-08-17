import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'

/** Blocks the whole authenticated area for signed-out visitors. */
export function RequireAuth() {
  const token = useAppSelector((state) => state.auth.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
