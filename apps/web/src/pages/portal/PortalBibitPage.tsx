import { Navigate } from 'react-router-dom';

/** Katalog ada di beranda portal */
export function PortalBibitPage() {
  return <Navigate to="/portal" replace />;
}
