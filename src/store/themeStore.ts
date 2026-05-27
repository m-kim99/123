import { create } from 'zustand';
import { savePreference } from '@/lib/preferences';
import { useAuthStore } from '@/store/authStore';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

function applyThemeClass(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Initialize from localStorage (instant, no flicker)
const stored = (typeof window !== 'undefined' ? localStorage.getItem('app-theme') : null) as ThemeMode | null;
const initialMode: ThemeMode = stored === 'dark' ? 'dark' : 'light';

// Apply on load
if (typeof window !== 'undefined') {
  applyThemeClass(initialMode);
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: initialMode,
  setMode: (mode: ThemeMode) => {
    localStorage.setItem('app-theme', mode);
    applyThemeClass(mode);
    set({ mode });

    // Save to DB (fire-and-forget)
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      savePreference(userId, 'theme', mode);
    }
  },
}));
