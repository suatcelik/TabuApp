import { create } from 'zustand';

const useGameStore = create((set) => ({
    // Başlangıç Ayarları
    settings: {
        duration: 60,
        maxPass: 3,
        vibration: true,
    },
    // Skorlar
    totalScores: { A: 0, B: 0 },

    // Ayarları Güncelleme Fonksiyonu
    setSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),

    // Skoru Güncelleme Fonksiyonu
    updateTotalScore: (team, score) =>
        set((state) => ({
            totalScores: { ...state.totalScores, [team]: state.totalScores[team] + score }
        })),

    // Oyunu Sıfırlama
    resetGame: () => set({ totalScores: { A: 0, B: 0 } }),
}));

export default useGameStore;