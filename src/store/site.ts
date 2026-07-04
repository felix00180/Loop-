import { create } from 'zustand';

interface SiteState {
  siteName: string;
  logoUrl: string | null;
  adminWhatsapp: string | null;
  fetchSettings: () => Promise<void>;
}

export const useSiteStore = create<SiteState>((set) => ({
  siteName: 'SorteRápida',
  logoUrl: null,
  adminWhatsapp: null,
  fetchSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        set({ siteName: data.siteName, logoUrl: data.logoUrl, adminWhatsapp: data.adminWhatsapp });
      }
    } catch (e) {
      console.error('Failed to fetch site settings', e);
    }
  }
}));
