import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export type StatCardTone =
  | 'emerald'
  | 'teal'
  | 'lime'
  | 'green'
  | 'sky'
  | 'violet';

type Props = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: StatCardTone;
};

const tones: Record<
  StatCardTone,
  {
    card: string;
    title: string;
    value: string;
    iconWrap: string;
    glow: string;
  }
> = {
  emerald: {
    card: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-white',
    title: 'text-emerald-700/80',
    value: 'text-emerald-950',
    iconWrap: 'bg-emerald-500 text-white shadow-[0_8px_18px_-8px_rgba(16,185,129,0.85)]',
    glow: 'bg-emerald-400/25',
  },
  teal: {
    card: 'border-teal-200/70 bg-gradient-to-br from-teal-50 via-cyan-50/70 to-white',
    title: 'text-teal-700/80',
    value: 'text-teal-950',
    iconWrap: 'bg-teal-500 text-white shadow-[0_8px_18px_-8px_rgba(20,184,166,0.85)]',
    glow: 'bg-teal-400/25',
  },
  lime: {
    card: 'border-lime-200/70 bg-gradient-to-br from-lime-50 via-green-50/70 to-white',
    title: 'text-lime-800/80',
    value: 'text-lime-950',
    iconWrap: 'bg-lime-600 text-white shadow-[0_8px_18px_-8px_rgba(132,204,22,0.75)]',
    glow: 'bg-lime-400/25',
  },
  green: {
    card: 'border-green-200/70 bg-gradient-to-br from-green-50 via-emerald-50/60 to-white',
    title: 'text-green-700/80',
    value: 'text-green-950',
    iconWrap: 'bg-primary text-white shadow-[0_8px_18px_-8px_rgba(7,132,74,0.85)]',
    glow: 'bg-primary/20',
  },
  sky: {
    card: 'border-sky-200/70 bg-gradient-to-br from-sky-50 via-blue-50/70 to-white',
    title: 'text-sky-700/80',
    value: 'text-sky-950',
    iconWrap: 'bg-sky-500 text-white shadow-[0_8px_18px_-8px_rgba(14,165,233,0.85)]',
    glow: 'bg-sky-400/25',
  },
  violet: {
    card: 'border-violet-200/70 bg-gradient-to-br from-violet-50 via-fuchsia-50/50 to-white',
    title: 'text-violet-700/80',
    value: 'text-violet-950',
    iconWrap: 'bg-violet-500 text-white shadow-[0_8px_18px_-8px_rgba(139,92,246,0.85)]',
    glow: 'bg-violet-400/25',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = 'emerald',
}: Props) {
  const t = tones[tone];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border p-4 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-md',
        t.card,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition group-hover:scale-110',
          t.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={cn('line-clamp-2 text-[11px] font-medium leading-snug', t.title)}>
            {title}
          </div>
          <div className={cn('mt-1.5 text-xl font-semibold tracking-tight xl:text-[22px]', t.value)}>
            {value}
          </div>
        </div>
        <div
          className={cn(
            'shrink-0 rounded-xl p-2 transition duration-300 group-hover:scale-105',
            t.iconWrap,
          )}
        >
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}
