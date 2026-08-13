import { useEffect } from 'react';
import { useBrandingStore } from '../../stores/brandingStore';

/** Muat branding publik sekali saat aplikasi start */
export function BrandingBootstrap({ children }: { children: React.ReactNode }) {
  const loadBranding = useBrandingStore((s) => s.loadBranding);

  useEffect(() => {
    void loadBranding();
  }, [loadBranding]);

  return <>{children}</>;
}
