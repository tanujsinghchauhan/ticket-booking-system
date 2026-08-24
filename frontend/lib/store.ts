import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  selectedSeats: string[];
  selectSeat: (seatId: string) => void;
  deselectSeat: (seatId: string) => void;
  clearSelectedSeats: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        const root = window.document.documentElement;
        if (newTheme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        localStorage.setItem('theme', newTheme);
      }
      return { theme: newTheme };
    }),
  setTheme: (theme) =>
    set(() => {
      if (typeof window !== 'undefined') {
        const root = window.document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
      }
      return { theme };
    }),
  selectedSeats: [],
  selectSeat: (seatId) =>
    set((state) => ({
      selectedSeats: state.selectedSeats.includes(seatId)
        ? state.selectedSeats
        : [...state.selectedSeats, seatId],
    })),
  deselectSeat: (seatId) =>
    set((state) => ({
      selectedSeats: state.selectedSeats.filter((id) => id !== seatId),
    })),
  clearSelectedSeats: () => set({ selectedSeats: [] }),
}));
