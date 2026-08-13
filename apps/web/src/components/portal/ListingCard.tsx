import { Leaf, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  publicAssetUrl,
  type PublicListingCard,
} from '../../services/public';
import { cn } from '../../lib/utils';

function formatAge(months: number | null | undefined) {
  if (months == null) return null;
  if (months < 12) return `${months} bln`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} th ${m} bln` : `${y} th`;
}

export function ListingCard({
  item,
  compact = false,
}: {
  item: PublicListingCard;
  compact?: boolean;
}) {
  const cover = publicAssetUrl(item.coverUrl);
  const age = formatAge(item.ageMonths);

  return (
    <Link
      to={`/portal/bibit/${item.id}`}
      className={cn(
        'group flex flex-col overflow-hidden bg-white transition active:scale-[0.98]',
        compact
          ? 'rounded-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]'
          : 'rounded-xl ring-1 ring-black/[0.06] hover:ring-black/10',
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-slate-100',
          compact ? 'aspect-[1/1]' : 'aspect-[4/3]',
        )}
      >
        {cover ? (
          <img
            src={cover}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
            <Leaf size={compact ? 28 : 32} />
          </div>
        )}
        {age && compact && (
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {age}
          </span>
        )}
      </div>
      <div
        className={cn(
          'flex flex-1 flex-col',
          compact ? 'gap-1 p-2.5' : 'gap-1.5 p-3.5',
        )}
      >
        <p
          className={cn(
            'font-medium text-slate-400',
            compact ? 'text-[10px]' : 'text-[11px]',
          )}
        >
          {item.commodity.name}
          {!compact && item.variety ? ` · ${item.variety.name}` : ''}
        </p>
        <h3
          className={cn(
            'font-semibold leading-snug text-slate-900',
            compact ? 'line-clamp-2 text-[13px]' : 'line-clamp-2 text-sm',
          )}
        >
          {item.title}
        </h3>
        <p
          className={cn(
            'flex items-center gap-1 text-slate-500',
            compact ? 'text-[11px]' : 'text-xs',
          )}
        >
          <MapPin size={compact ? 10 : 11} className="shrink-0" />
          <span className="truncate">
            {item.producer.kabupaten || item.producer.businessName}
          </span>
        </p>
        {!compact && (
          <div className="mt-auto flex items-center justify-between pt-2 text-xs text-slate-600">
            <span>
              {item.availableQty != null
                ? `${item.availableQty.toLocaleString('id-ID')} ${item.unit}`
                : '—'}
            </span>
            {age && <span className="text-slate-400">Usia {age}</span>}
          </div>
        )}
        {compact && item.availableQty != null && (
          <p className="mt-auto pt-1 text-[11px] font-semibold text-emerald-800">
            {item.availableQty.toLocaleString('id-ID')} {item.unit}
          </p>
        )}
      </div>
    </Link>
  );
}
