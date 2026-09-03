import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  bannerImageSrc,
  type DashboardBanner,
} from '../../services/settings';

const AUTOPLAY_MS = 4500;

const SLIDE_THEMES = [
  {
    bg: 'bg-[linear-gradient(135deg,#0b3d2e_0%,#1a7a52_48%,#2a9d7a_100%)]',
    accent: 'bg-emerald-300/25',
  },
  {
    bg: 'bg-[linear-gradient(135deg,#14352f_0%,#1f6b5a_50%,#2d8f7b_100%)]',
    accent: 'bg-teal-200/20',
  },
  {
    bg: 'bg-[linear-gradient(145deg,#1a2e28_0%,#245c45_55%,#3a8f6a_100%)]',
    accent: 'bg-lime-200/15',
  },
  {
    bg: 'bg-[linear-gradient(135deg,#102820_0%,#1e5c40_45%,#278a6a_100%)]',
    accent: 'bg-cyan-200/15',
  },
];

type Props = {
  items: DashboardBanner[];
  /** Mode portal/app: kartu rounded full-width */
  native?: boolean;
};

function realSlideIndex(index: number, count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 0;
  const shifted = index - 1;
  return ((shifted % count) + count) % count;
}

export function DashboardBannerCarousel({ items, native = false }: Props) {
  const count = items.length;
  /**
   * Track index (dengan clone):
   * [lastClone, ...items, firstClone] → index real = 1..count
   */
  const [index, setIndex] = useState(count > 1 ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const jumping = useRef(false);

  const trackItems =
    count > 1 ? [items[count - 1]!, ...items, items[0]!] : items;

  useEffect(() => {
    setIndex(count > 1 ? 1 : 0);
    setAnimate(true);
    jumping.current = false;
  }, [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setAnimate(true);
      setIndex((i) => {
        if (native) return i >= count + 1 ? 1 : i + 1;
        return i >= count ? 1 : i + 1;
      });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, native]);

  function handleTransitionEnd() {
    if (count <= 1 || jumping.current) return;

    if (index === count + 1) {
      jumping.current = true;
      setAnimate(false);
      setIndex(1);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
          jumping.current = false;
        });
      });
      return;
    }

    if (index === 0) {
      jumping.current = true;
      setAnimate(false);
      setIndex(count);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
          jumping.current = false;
        });
      });
    }
  }

  if (count === 0) return null;

  const activeDot = realSlideIndex(index, count);
  const current = items[activeDot];
  if (!current) return null;

  function go(delta: number) {
    if (count <= 1 || jumping.current) return;
    setAnimate(true);
    setIndex((i) => i + delta);
  }

  function goTo(dotIndex: number) {
    if (jumping.current) return;
    setAnimate(true);
    setIndex(count > 1 ? dotIndex + 1 : dotIndex);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
    setPaused(true);
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    const end = e.changedTouches[0]?.clientX;
    touchStartX.current = null;
    setPaused(false);
    if (start == null || end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < 36) return;
    go(delta < 0 ? 1 : -1);
  }

  if (native) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="overflow-hidden rounded-[22px]">
          <div
            className={cn(
              'flex w-full will-change-transform',
              animate &&
                'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            )}
            style={{
              transform: `translate3d(-${index * 100}%, 0, 0)`,
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {trackItems.map((item, i) =>
              item ? (
              <div
                key={`${item.id}-${i}`}
                className="w-full shrink-0 grow-0 basis-full"
              >
                <NativeSlide
                  item={item}
                  theme={SLIDE_THEMES[i % SLIDE_THEMES.length]!}
                  active={i === index}
                />
              </div>
              ) : null,
            )}
          </div>
        </div>

        {count > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Banner ${i + 1}`}
                onClick={() => goTo(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === activeDot
                    ? 'w-5 bg-emerald-700'
                    : 'w-1.5 bg-slate-300/90 hover:bg-slate-400',
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const imageSrc = bannerImageSrc(current.imageUrl);
  const theme = SLIDE_THEMES[activeDot % SLIDE_THEMES.length]!;
  const hasTitle = Boolean(current.title?.trim());
  const hasSubtitle = Boolean(current.subtitle?.trim());

  const desktopInner = (
    <>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className={cn('absolute inset-0', theme.bg)}>
          <div
            className={cn(
              'absolute -right-10 -top-10 h-48 w-48 rounded-full blur-2xl',
              theme.accent,
            )}
          />
          <div
            className={cn(
              'absolute -bottom-16 left-10 h-40 w-40 rounded-full blur-2xl',
              theme.accent,
            )}
          />
        </div>
      )}
      {(hasTitle || hasSubtitle) && (
        <>
          <div
            className={cn(
              'absolute inset-0',
              imageSrc
                ? 'bg-gradient-to-t from-black/70 via-black/25 to-black/5'
                : 'bg-gradient-to-t from-black/35 via-transparent to-transparent',
            )}
          />
          <div className="relative z-10 flex h-full flex-col justify-end px-6 py-5 sm:px-8 sm:py-6">
            {hasTitle && (
              <h2 className="max-w-xl text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {current.title}
              </h2>
            )}
            {hasSubtitle && (
              <p className="mt-1.5 line-clamp-2 max-w-xl text-sm text-white/85">
                {current.subtitle}
              </p>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {current.linkUrl ? (
        current.linkUrl.startsWith('/') ? (
          <Link
            to={current.linkUrl}
            className="relative block h-[140px] overflow-hidden rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:h-[160px] lg:h-[176px]"
          >
            {desktopInner}
          </Link>
        ) : (
          <a
            href={current.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block h-[140px] overflow-hidden rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:h-[160px] lg:h-[176px]"
          >
            {desktopInner}
          </a>
        )
      ) : (
        <div className="relative h-[140px] overflow-hidden rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:h-[160px] lg:h-[176px]">
          {desktopInner}
        </div>
      )}

      {count > 1 && (
        <div className="absolute bottom-3.5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Banner ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === activeDot
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-white/45 hover:bg-white/75',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NativeSlide({
  item,
  theme,
  active,
}: {
  item: DashboardBanner;
  theme: (typeof SLIDE_THEMES)[number];
  active: boolean;
}) {
  const imageSrc = bannerImageSrc(item.imageUrl);
  const hasTitle = Boolean(item.title?.trim());
  const hasSubtitle = Boolean(item.subtitle?.trim());

  const body = (
    <div
      className={cn(
        'relative h-[168px] w-full overflow-hidden transition duration-500',
        active
          ? 'shadow-[0_10px_28px_rgba(15,23,42,0.12)]'
          : 'shadow-[0_4px_14px_rgba(15,23,42,0.06)]',
      )}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className={cn('absolute inset-0', theme.bg)}>
          <div
            className={cn(
              'absolute -right-8 top-0 h-36 w-36 rounded-full blur-2xl',
              theme.accent,
            )}
          />
          <div className="absolute bottom-0 right-0 h-28 w-28 translate-x-4 translate-y-4 rounded-[28px] border border-white/10 bg-white/[0.06]" />
          <div className="absolute right-6 top-6 h-16 w-16 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-[2px]" />
        </div>
      )}

      {(hasTitle || hasSubtitle) && (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.62)_100%)]" />
          <div className="relative z-10 flex h-full flex-col justify-end p-4">
            {hasTitle && (
              <h2 className="text-[17px] font-bold leading-snug tracking-tight text-white drop-shadow-sm">
                {item.title}
              </h2>
            )}
            {hasSubtitle && (
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/85">
                {item.subtitle}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (item.linkUrl) {
    if (item.linkUrl.startsWith('/')) {
      return (
        <Link to={item.linkUrl} className="block w-full">
          {body}
        </Link>
      );
    }
    return (
      <a
        href={item.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        {body}
      </a>
    );
  }

  return body;
}
