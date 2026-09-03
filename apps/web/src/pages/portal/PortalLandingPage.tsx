import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sprout,
  UserPlus,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { settingsApi, brandingLogoSrc } from '../../services/settings';

const KalselDistributionMap = lazy(async () => {
  const module = await import('../../components/portal/KalselDistributionMap');
  return { default: module.KalselDistributionMap };
});

const serviceIcons = [UserPlus, BadgeCheck, ClipboardCheck, BookOpen];
const responsibilityIcons = [Sprout, BadgeCheck, ShieldCheck, CheckCircle2];

export function PortalLandingPage() {
  const query = useQuery({
    queryKey: ['settings', 'portal-content'],
    queryFn: async () => (await settingsApi.getPortalContent()).data.data,
    staleTime: 60_000,
  });

  if (query.isLoading) return <LandingSkeleton />;
  if (query.isError || !query.data) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-[#15302a]">Portal belum dapat dimuat</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Terjadi kendala saat memuat informasi balai. Silakan coba kembali.
        </p>
        <button type="button" onClick={() => query.refetch()} className="mt-5 rounded-lg bg-[#0c4a3a] px-5 py-2.5 text-sm font-semibold text-white">
          Muat ulang
        </button>
      </div>
    );
  }

  const { content, media } = query.data;
  const heroImage =
    brandingLogoSrc(media.heroImageUrl) ?? '/images/portal-hero.png';
  const serviceImage =
    brandingLogoSrc(media.serviceImageUrl) ?? '/images/portal-service.png';

  return (
    <div className="overflow-hidden bg-white text-[#15302a]">
      {content.hero.enabled ? (
        <section id="beranda" className="relative border-b border-[#e3ece7]">
          <div className="portal-contours absolute -bottom-16 -left-16 h-72 w-72 opacity-50" aria-hidden="true" />
          <div className="mx-auto grid min-h-[620px] max-w-[1440px] lg:grid-cols-2">
            <div className="relative z-10 flex items-center px-5 py-16 sm:px-8 lg:px-16 xl:px-20">
              <div className="max-w-2xl">
                <h1 className="text-balance text-[clamp(2.5rem,5vw,4.8rem)] font-bold leading-[1.07] tracking-[-0.045em] text-[#092e25]">
                  {content.hero.title}
                </h1>
                <p className="mt-7 max-w-xl border-l-[3px] border-[#e4a72c] pl-5 text-base leading-7 text-[#425f57] sm:text-lg sm:leading-8">
                  {content.hero.description}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <SmartLink href={content.hero.primaryLink} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0c4a3a] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(12,74,58,0.18)] transition hover:bg-[#083b2e] focus:outline-none focus:ring-2 focus:ring-[#2f8f55] focus:ring-offset-2">
                    {content.hero.primaryLabel}<ArrowRight className="h-4 w-4" />
                  </SmartLink>
                  <SmartLink href={content.hero.secondaryLink} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#0c4a3a] bg-white px-6 text-sm font-semibold text-[#0c4a3a] transition hover:bg-[#eef7f1] focus:outline-none focus:ring-2 focus:ring-[#2f8f55] focus:ring-offset-2">
                    {content.hero.secondaryLabel}<ArrowRight className="h-4 w-4" />
                  </SmartLink>
                </div>
              </div>
            </div>
            <div className="relative min-h-[420px] overflow-hidden lg:min-h-full lg:rounded-bl-[72px]">
              <img src={heroImage} alt="Petugas memeriksa bibit perkebunan di Kalimantan Selatan" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </div>
        </section>
      ) : null}

      {content.profile.enabled ? (
        <section id="profil" className="relative scroll-mt-24 py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <h2 className="border-l-[3px] border-[#e4a72c] pl-5 text-3xl font-bold leading-tight tracking-[-0.03em] text-[#0a382c] sm:text-4xl">
                {content.profile.title}
              </h2>
              <p className="mt-7 text-[15px] leading-7 text-[#526b64]">{content.profile.body}</p>
              {content.profile.secondaryBody ? (
                <p className="mt-4 text-[15px] leading-7 text-[#526b64]">{content.profile.secondaryBody}</p>
              ) : null}
            </div>
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-[#0c4a3a]">Tugas dan Tanggung Jawab</h3>
              <div className="divide-y divide-[#dde8e2] border-y border-[#dde8e2]">
                {content.profile.responsibilities.map((item, index) => {
                  const Icon = responsibilityIcons[index % responsibilityIcons.length];
                  return (
                    <div key={`${item}-${index}`} className="flex gap-4 py-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e5f2e9] text-[#176447]"><Icon className="h-4 w-4" /></span>
                      <p className="pt-1.5 text-sm leading-6 text-[#425f57]">{item}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {content.services.enabled ? (
        <section id="layanan" className="scroll-mt-24 border-y border-[#e3ece7] bg-[#fbfdfc] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
              <div>
                <h2 className="border-l-[3px] border-[#e4a72c] pl-5 text-3xl font-bold tracking-[-0.03em] text-[#0a382c] sm:text-4xl">{content.services.title}</h2>
                <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#526b64]">{content.services.intro}</p>
                <div className="mt-9 divide-y divide-[#dce7e1] border-y border-[#dce7e1]">
                  {content.services.items.map((item, index) => {
                    const Icon = serviceIcons[index % serviceIcons.length];
                    return (
                      <SmartLink key={`${item.title}-${index}`} href={item.link} className="group grid gap-4 py-5 transition hover:bg-[#f2f8f4] sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center sm:px-3">
                        <span className="flex h-12 w-12 items-center justify-center text-[#0c4a3a]"><Icon className="h-8 w-8" strokeWidth={1.5} /></span>
                        <span>
                          <span className="block text-lg font-bold text-[#15302a]">{item.title}</span>
                          <span className="mt-1 block text-sm leading-6 text-[#667b75]">{item.description}</span>
                        </span>
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#24754f]">Pelajari layanan<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                      </SmartLink>
                    );
                  })}
                </div>
              </div>
              <img src={serviceImage} alt="Petugas mendampingi penangkar dalam pemeriksaan benih" className="h-full max-h-[620px] w-full rounded-2xl object-cover shadow-[0_18px_50px_rgba(13,64,48,0.12)]" loading="lazy" />
            </div>
          </div>
        </section>
      ) : null}

      {content.visionMission.enabled ? (
        <section id="visi-misi" className="relative scroll-mt-24 overflow-hidden bg-[#073f31] py-20 text-white sm:py-24">
          <div className="portal-contours absolute -right-20 top-4 h-80 w-80 opacity-15" aria-hidden="true" />
          <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <h2 className="border-l-[3px] border-[#e4a72c] pl-5 text-lg font-bold text-[#f2bd47]">Visi</h2>
              <p className="mt-6 text-3xl font-bold leading-[1.28] tracking-[-0.03em] sm:text-4xl">{content.visionMission.vision}</p>
            </div>
            <div>
              <h2 className="border-l-[3px] border-[#e4a72c] pl-5 text-lg font-bold text-[#f2bd47]">Misi</h2>
              <ol className="mt-5 divide-y divide-white/20 border-y border-white/20">
                {content.visionMission.missions.map((mission, index) => (
                  <li key={`${mission}-${index}`} className="grid grid-cols-[64px_1fr] gap-4 py-5">
                    <span className="text-3xl font-bold text-[#3fa76c]">{String(index + 1).padStart(2, '0')}</span>
                    <p className="pt-1 text-sm leading-6 text-white/88 sm:text-base">{mission}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      {content.map.enabled ? (
        <section id="peta" className="scroll-mt-24 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-10 max-w-2xl">
              <h2 className="border-l-[3px] border-[#e4a72c] pl-5 text-3xl font-bold tracking-[-0.03em] text-[#0a382c] sm:text-4xl">{content.map.title}</h2>
              <p className="mt-5 text-[15px] leading-7 text-[#526b64]">{content.map.description}</p>
            </div>
            <Suspense fallback={<div className="flex h-[500px] items-center justify-center rounded-2xl border border-[#dbe7e1] bg-[#f7fbf8] text-sm text-slate-500">Memuat peta Kalimantan Selatan…</div>}>
              <KalselDistributionMap />
            </Suspense>
          </div>
        </section>
      ) : null}

      {content.contact.enabled ? (
        <section id="kontak" className="scroll-mt-24 px-4 pb-8 sm:px-8">
          <div className="portal-contours relative mx-auto grid max-w-[1400px] gap-8 overflow-hidden rounded-3xl bg-[#073f31] px-6 py-10 text-white sm:px-10 lg:grid-cols-[1fr_auto_0.85fr] lg:items-center lg:px-14">
            <h2 className="relative z-10 text-2xl font-bold leading-tight sm:text-3xl">{content.contact.title}</h2>
            <div className="relative z-10 flex flex-col gap-3 sm:flex-row">
              <SmartLink href={content.contact.primaryLink} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#2f9b60] px-5 text-sm font-semibold text-white transition hover:bg-[#36aa6b]">{content.contact.primaryLabel}<ArrowRight className="h-4 w-4" /></SmartLink>
              <SmartLink href={content.contact.secondaryLink} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/70 px-5 text-sm font-semibold text-white transition hover:bg-white/10">{content.contact.secondaryLabel}<ArrowRight className="h-4 w-4" /></SmartLink>
            </div>
            <dl className="relative z-10 space-y-2 border-t border-white/20 pt-6 text-sm text-white/85 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <ContactRow icon={MapPin} value={content.contact.address} />
              <ContactRow icon={Clock3} value={content.contact.hours} />
              <ContactRow icon={Phone} value={content.contact.phone} />
              <ContactRow icon={Mail} value={content.contact.email} />
            </dl>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ContactRow({ icon: Icon, value }: { icon: typeof MapPin; value: string }) {
  return <div className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#78d69b]" /><span>{value}</span></div>;
}

function SmartLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  const external = /^(https?:|mailto:|tel:)/i.test(href);
  return <a href={href} className={className} {...(external && href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a>;
}

function LandingSkeleton() {
  return (
    <div className="animate-pulse bg-white">
      <div className="mx-auto grid min-h-[620px] max-w-[1440px] lg:grid-cols-2">
        <div className="space-y-6 px-6 py-24 lg:px-20">
          <div className="h-16 max-w-xl rounded-xl bg-slate-100" />
          <div className="h-16 max-w-lg rounded-xl bg-slate-100" />
          <div className="h-24 max-w-xl rounded-xl bg-slate-100" />
        </div>
        <div className="min-h-[420px] bg-slate-100" />
      </div>
    </div>
  );
}
