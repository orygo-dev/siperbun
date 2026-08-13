import { APP_FULL_NAME, APP_NAME, OFFICE_NAME } from '@siperbun/shared';
import { create } from 'zustand';
import {
  brandingLogoSrc,
  settingsApi,
  type Branding,
} from '../services/settings';

type BrandingState = {
  branding: Branding;
  loaded: boolean;
  setBranding: (b: Branding) => void;
  loadBranding: () => Promise<void>;
  logoSrc: () => string | null;
};

const defaults: Branding = {
  appName: APP_NAME,
  fullName: APP_FULL_NAME,
  officeName: OFFICE_NAME,
  logoFileId: null,
  logoUrl: null,
};

export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: defaults,
  loaded: false,
  setBranding: (branding) => set({ branding, loaded: true }),
  loadBranding: async () => {
    try {
      const res = await settingsApi.getBranding();
      set({ branding: res.data.data, loaded: true });
      document.title = `${res.data.data.appName} — ${res.data.data.fullName}`;
    } catch {
      set({ branding: defaults, loaded: true });
    }
  },
  logoSrc: () => brandingLogoSrc(get().branding.logoUrl),
}));
