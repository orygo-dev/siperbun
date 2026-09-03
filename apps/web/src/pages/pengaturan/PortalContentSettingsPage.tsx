import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { cn } from '../../lib/utils';
import {
  brandingLogoSrc,
  settingsApi,
  type PortalContent,
  type PortalMediaSlot,
} from '../../services/settings';
import { useAuthStore } from '../../stores/authStore';

type SectionKey =
  | 'hero'
  | 'profile'
  | 'services'
  | 'visionMission'
  | 'map'
  | 'contact';

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: 'hero', label: 'Hero' },
  { key: 'profile', label: 'Profil' },
  { key: 'services', label: 'Layanan Penangkar' },
  { key: 'visionMission', label: 'Visi & Misi' },
  { key: 'map', label: 'Peta' },
  { key: 'contact', label: 'Kontak' },
];

export function PortalContentSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [active, setActive] = useState<SectionKey>('hero');
  const [draft, setDraft] = useState<PortalContent | null>(null);
  const [dirty, setDirty] = useState(false);

  const query = useQuery({
    queryKey: ['settings', 'portal-content'],
    queryFn: async () => (await settingsApi.getPortalContent()).data.data,
  });

  useEffect(() => {
    if (!query.data || dirty) return;
    setDraft(structuredClone(query.data.content));
  }, [query.data, dirty]);

  const saveMutation = useMutation({
    mutationFn: (payload: PortalContent) =>
      settingsApi.updatePortalContent(payload),
    onSuccess: async (response) => {
      setDraft(structuredClone(response.data.data.content));
      setDirty(false);
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'portal-content'],
      });
      toast.success('Konten portal berhasil disimpan');
    },
    onError: () => toast.error('Konten belum dapat disimpan. Periksa semua isian.'),
  });

  const mediaMutation = useMutation({
    mutationFn: ({ slot, file }: { slot: PortalMediaSlot; file: File }) =>
      settingsApi.uploadPortalMedia(slot, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'portal-content'],
      });
      toast.success('Gambar portal berhasil diperbarui');
    },
    onError: () => toast.error('Gambar gagal diunggah'),
  });

  const clearMediaMutation = useMutation({
    mutationFn: (slot: PortalMediaSlot) => settingsApi.clearPortalMedia(slot),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'portal-content'],
      });
      toast.success('Gambar kembali menggunakan aset bawaan');
    },
    onError: () => toast.error('Gambar gagal dihapus'),
  });

  if (!user?.roles.includes('SUPER_ADMIN')) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 text-sm text-slate-600">
        Hanya Super Admin yang dapat mengelola konten portal.
      </div>
    );
  }

  if (query.isLoading || !draft) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat konten portal…
      </div>
    );
  }

  const setContent = (updater: (content: PortalContent) => PortalContent) => {
    setDraft((current) => (current ? updater(current) : current));
    setDirty(true);
  };
  const media = query.data?.media;
  const heroImage = brandingLogoSrc(media?.heroImageUrl) ?? '/images/portal-hero.png';
  const serviceImage =
    brandingLogoSrc(media?.serviceImageUrl) ?? '/images/portal-service.png';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Konten Portal"
          subtitle="Kelola informasi yang tampil pada landing page publik"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {dirty ? 'Perubahan belum disimpan' : 'Semua perubahan tersimpan'}
          </span>
          <button
            type="button"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate(draft)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Perubahan
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
        <div className="flex overflow-x-auto border-b border-border px-4">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActive(section.key)}
              className={cn(
                'shrink-0 border-b-2 px-4 py-3.5 text-sm font-medium transition',
                active === section.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <div className="min-w-0 rounded-xl border border-border p-5">
            <SectionEditor
              active={active}
              content={draft}
              setContent={setContent}
              heroImage={heroImage}
              serviceImage={serviceImage}
              uploading={mediaMutation.isPending}
              clearing={clearMediaMutation.isPending}
              onUpload={(slot, file) => mediaMutation.mutate({ slot, file })}
              onClear={(slot) => clearMediaMutation.mutate(slot)}
              hasHeroOverride={Boolean(media?.heroImageUrl)}
              hasServiceOverride={Boolean(media?.serviceImageUrl)}
            />
          </div>

          <PortalPreview content={draft} heroImage={heroImage} active={active} />
        </div>
      </div>
    </div>
  );
}

function SectionEditor({
  active,
  content,
  setContent,
  heroImage,
  serviceImage,
  uploading,
  clearing,
  onUpload,
  onClear,
  hasHeroOverride,
  hasServiceOverride,
}: {
  active: SectionKey;
  content: PortalContent;
  setContent: (updater: (content: PortalContent) => PortalContent) => void;
  heroImage: string;
  serviceImage: string;
  uploading: boolean;
  clearing: boolean;
  onUpload: (slot: PortalMediaSlot, file: File) => void;
  onClear: (slot: PortalMediaSlot) => void;
  hasHeroOverride: boolean;
  hasServiceOverride: boolean;
}) {
  const update = <K extends keyof PortalContent>(
    key: K,
    value: PortalContent[K],
  ) => setContent((current) => ({ ...current, [key]: value }));

  if (active === 'hero') {
    const section = content.hero;
    return (
      <EditorGroup title="Hero" description="Konten utama pada bagian teratas portal.">
        <Toggle
          checked={section.enabled}
          onChange={(enabled) => update('hero', { ...section, enabled })}
        />
        <TextArea label="Judul utama" value={section.title} rows={3} onChange={(title) => update('hero', { ...section, title })} />
        <TextArea label="Deskripsi" value={section.description} rows={4} onChange={(description) => update('hero', { ...section, description })} />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Teks tombol utama" value={section.primaryLabel} onChange={(primaryLabel) => update('hero', { ...section, primaryLabel })} />
          <TextField label="Tautan tombol utama" value={section.primaryLink} onChange={(primaryLink) => update('hero', { ...section, primaryLink })} />
          <TextField label="Teks tombol kedua" value={section.secondaryLabel} onChange={(secondaryLabel) => update('hero', { ...section, secondaryLabel })} />
          <TextField label="Tautan tombol kedua" value={section.secondaryLink} onChange={(secondaryLink) => update('hero', { ...section, secondaryLink })} />
        </div>
        <MediaField label="Gambar hero" slot="hero" src={heroImage} busy={uploading || clearing} hasOverride={hasHeroOverride} onUpload={onUpload} onClear={onClear} />
      </EditorGroup>
    );
  }

  if (active === 'profile') {
    const section = content.profile;
    return (
      <EditorGroup title="Profil Balai" description="Identitas, peran, dan tanggung jawab balai.">
        <Toggle checked={section.enabled} onChange={(enabled) => update('profile', { ...section, enabled })} />
        <TextField label="Judul profil" value={section.title} onChange={(title) => update('profile', { ...section, title })} />
        <TextArea label="Deskripsi utama" value={section.body} rows={5} onChange={(body) => update('profile', { ...section, body })} />
        <TextArea label="Deskripsi lanjutan" value={section.secondaryBody} rows={4} onChange={(secondaryBody) => update('profile', { ...section, secondaryBody })} />
        <StringList label="Tugas dan tanggung jawab" values={section.responsibilities} onChange={(responsibilities) => update('profile', { ...section, responsibilities })} />
      </EditorGroup>
    );
  }

  if (active === 'services') {
    const section = content.services;
    return (
      <EditorGroup title="Layanan Penangkar" description="Layanan utama yang ditawarkan melalui portal.">
        <Toggle checked={section.enabled} onChange={(enabled) => update('services', { ...section, enabled })} />
        <TextField label="Judul bagian" value={section.title} onChange={(title) => update('services', { ...section, title })} />
        <TextArea label="Pengantar" value={section.intro} rows={3} onChange={(intro) => update('services', { ...section, intro })} />
        <div className="space-y-4">
          {section.items.map((item, index) => (
            <div key={index} className="rounded-lg border border-border p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Layanan {index + 1}</div>
              <div className="space-y-3">
                <TextField label="Nama layanan" value={item.title} onChange={(title) => update('services', { ...section, items: section.items.map((current, itemIndex) => itemIndex === index ? { ...current, title } : current) })} />
                <TextArea label="Deskripsi" value={item.description} rows={2} onChange={(description) => update('services', { ...section, items: section.items.map((current, itemIndex) => itemIndex === index ? { ...current, description } : current) })} />
                <TextField label="Tautan" value={item.link} onChange={(link) => update('services', { ...section, items: section.items.map((current, itemIndex) => itemIndex === index ? { ...current, link } : current) })} />
              </div>
            </div>
          ))}
        </div>
        <MediaField label="Gambar layanan" slot="service" src={serviceImage} busy={uploading || clearing} hasOverride={hasServiceOverride} onUpload={onUpload} onClear={onClear} />
      </EditorGroup>
    );
  }

  if (active === 'visionMission') {
    const section = content.visionMission;
    return (
      <EditorGroup title="Visi & Misi" description="Arah dan komitmen pelayanan organisasi.">
        <Toggle checked={section.enabled} onChange={(enabled) => update('visionMission', { ...section, enabled })} />
        <TextArea label="Visi" value={section.vision} rows={5} onChange={(vision) => update('visionMission', { ...section, vision })} />
        <StringList label="Misi" values={section.missions} onChange={(missions) => update('visionMission', { ...section, missions })} />
      </EditorGroup>
    );
  }

  if (active === 'map') {
    const section = content.map;
    return (
      <EditorGroup title="Peta Sebaran" description="Judul dan pengantar peta Kalimantan Selatan.">
        <Toggle checked={section.enabled} onChange={(enabled) => update('map', { ...section, enabled })} />
        <TextField label="Judul bagian" value={section.title} onChange={(title) => update('map', { ...section, title })} />
        <TextArea label="Deskripsi" value={section.description} rows={4} onChange={(description) => update('map', { ...section, description })} />
      </EditorGroup>
    );
  }

  const section = content.contact;
  return (
    <EditorGroup title="Kontak & Ajakan" description="Informasi pelayanan dan ajakan pada bagian akhir halaman.">
      <Toggle checked={section.enabled} onChange={(enabled) => update('contact', { ...section, enabled })} />
      <TextArea label="Judul ajakan" value={section.title} rows={3} onChange={(title) => update('contact', { ...section, title })} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Tombol utama" value={section.primaryLabel} onChange={(primaryLabel) => update('contact', { ...section, primaryLabel })} />
        <TextField label="Tautan utama" value={section.primaryLink} onChange={(primaryLink) => update('contact', { ...section, primaryLink })} />
        <TextField label="Tombol kedua" value={section.secondaryLabel} onChange={(secondaryLabel) => update('contact', { ...section, secondaryLabel })} />
        <TextField label="Tautan kedua" value={section.secondaryLink} onChange={(secondaryLink) => update('contact', { ...section, secondaryLink })} />
        <TextField label="Alamat" value={section.address} onChange={(address) => update('contact', { ...section, address })} />
        <TextField label="Jam layanan" value={section.hours} onChange={(hours) => update('contact', { ...section, hours })} />
        <TextField label="Telepon" value={section.phone} onChange={(phone) => update('contact', { ...section, phone })} />
        <TextField label="Email" type="email" value={section.email} onChange={(email) => update('contact', { ...section, email })} />
      </div>
    </EditorGroup>
  );
}

function EditorGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" />
    </label>
  );
}

function TextArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className="w-full resize-y rounded-lg border border-border px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" />
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
      Tampilkan bagian ini
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn('relative h-6 w-11 rounded-full transition', checked ? 'bg-primary' : 'bg-slate-300')}>
        <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition', checked ? 'left-6' : 'left-1')} />
      </button>
    </label>
  );
}

function StringList({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <span className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-xs font-bold text-primary">{String(index + 1).padStart(2, '0')}</span>
          <input value={value} onChange={(event) => onChange(values.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="h-10 min-w-0 flex-1 rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
        </div>
      ))}
    </div>
  );
}

function MediaField({ label, slot, src, busy, hasOverride, onUpload, onClear }: { label: string; slot: PortalMediaSlot; src: string; busy: boolean; hasOverride: boolean; onUpload: (slot: PortalMediaSlot, file: File) => void; onClear: (slot: PortalMediaSlot) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 p-3">
        <img src={src} alt="Pratinjau media portal" className="h-20 w-28 rounded-md object-cover" />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-primary/40">
          <ImagePlus className="h-4 w-4" /> Pilih gambar
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(slot, file); event.target.value = ''; }} />
        </label>
        {hasOverride ? (
          <button type="button" disabled={busy} onClick={() => onClear(slot)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> Gunakan bawaan
          </button>
        ) : null}
        <p className="w-full text-xs text-slate-500">PNG, JPG, atau WebP. Isi file diverifikasi oleh server.</p>
      </div>
    </div>
  );
}

function PortalPreview({ content, heroImage, active }: { content: PortalContent; heroImage: string; active: SectionKey }) {
  return (
    <aside className="h-fit overflow-hidden rounded-xl border border-border bg-white xl:sticky xl:top-20">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Pratinjau langsung</h2>
        <p className="mt-0.5 text-xs text-slate-500">Bagian aktif: {sections.find((section) => section.key === active)?.label}</p>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0c4a3a]">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#082f25]/95 via-[#082f25]/70 to-transparent" />
        <div className="relative flex h-full max-w-[72%] flex-col justify-center p-6 text-white">
          <h3 className="text-xl font-bold leading-tight">{content.hero.title}</h3>
          <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/80">{content.hero.description}</p>
          <div className="mt-4 flex gap-2">
            <span className="rounded-md bg-[#2f8f55] px-3 py-2 text-[10px] font-semibold">{content.hero.primaryLabel}</span>
            <span className="rounded-md border border-white/60 px-3 py-2 text-[10px] font-semibold">{content.hero.secondaryLabel}</span>
          </div>
        </div>
      </div>
      <p className="px-4 py-3 text-xs leading-5 text-slate-500">Pratinjau menjaga hierarki konten. Tampilan akhir menyesuaikan perangkat dan lebar layar.</p>
    </aside>
  );
}
