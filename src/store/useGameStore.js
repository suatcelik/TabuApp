import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useGameStore = create(
    persist(
        (set, get) => ({
            // --- AYARLAR (Otomatik Kaydedilir) ---
            settings: {
                duration: 60,
                maxPass: 3,
                vibration: true,
                teamAName: 'Takım A',
                teamBName: 'Takım B',
                roundsPerTeam: 4,
                selectedTheme: 'default', // Varsayılan aktif tema
            },

            // GÜNCELLENDİ: Tema paketinin tamamı satın alındı mı?
            isThemeBundlePurchased: false,

            // Ayarları güncelle
            updateSettings: (newSettings) => {
                set((state) => {
                    const merged = { ...state.settings, ...newSettings };
                    if (merged.roundsPerTeam) {
                        merged.roundsPerTeam = Math.max(1, Number(merged.roundsPerTeam) || 1);
                    }
                    return { settings: merged };
                });
            },

            // GÜNCELLENDİ: Paketin kilidini açan fonksiyon
            unlockThemeBundle: () => set({ isThemeBundlePurchased: true }),

            // --- OYUN SONU SKORU (Kaydedilmez) ---
            finalScores: { A: 0, B: 0 },

            setFinalScores: (scores) => {
                const next = {
                    A: Number(scores?.A ?? 0),
                    B: Number(scores?.B ?? 0),
                };
                set({ finalScores: next });
            },

            resetGame: () => set({ finalScores: { A: 0, B: 0 } }),
        }),
        {
            name: 'GAME_SETTINGS_STORAGE',
            storage: createJSONStorage(() => AsyncStorage),
            // GÜNCELLENDİ: isThemeBundlePurchased durumunu telefona kaydeder
            partialize: (state) => ({
                settings: state.settings,
                isThemeBundlePurchased: state.isThemeBundlePurchased
            }),
        }
    )
);

export default useGameStore;