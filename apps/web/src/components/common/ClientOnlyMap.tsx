import { useEffect, useState, type ReactNode } from 'react';

/** Leaflet MapContainer cannot survive React StrictMode remount on the same DOM node. */
export function ClientOnlyMap({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => {
      window.cancelAnimationFrame(id);
      setReady(false);
    };
  }, []);

  if (!ready) {
    return (
      <div
        className={className}
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
      />
    );
  }

  return <>{children}</>;
}
