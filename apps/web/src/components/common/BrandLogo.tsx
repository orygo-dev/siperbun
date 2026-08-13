import { Leaf } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useBrandingStore } from '../../stores/brandingStore';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Jika false (default untuk logo custom), tanpa background/frame */
  framed?: boolean;
};

const sizes = {
  sm: 'h-8 w-auto max-w-[7rem]',
  md: 'h-9 w-auto max-w-[9rem]',
  lg: 'h-12 w-auto max-w-[11rem]',
  xl: 'h-16 w-auto max-w-[14rem]',
};

const fallbackBox = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const iconSizes = {
  sm: 16,
  md: 18,
  lg: 24,
  xl: 32,
};

export function BrandLogo({ size = 'md', className, framed }: Props) {
  const logoSrc = useBrandingStore((s) => s.logoSrc);
  const appName = useBrandingStore((s) => s.branding.appName);
  const src = logoSrc();

  if (src) {
    const withFrame = framed === true;
    return (
      <img
        src={src}
        alt={`Logo ${appName}`}
        className={cn(
          sizes[size],
          'shrink-0 object-contain object-left',
          withFrame && 'rounded-xl bg-white p-1',
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        fallbackBox[size],
        'flex shrink-0 items-center justify-center rounded-xl bg-primary text-white',
        className,
      )}
    >
      <Leaf size={iconSizes[size]} />
    </div>
  );
}
