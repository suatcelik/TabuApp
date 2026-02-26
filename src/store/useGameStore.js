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

            // Tema paketinin tamamı satın alındı mı?
            isThemeBundlePurchased: false,

            // YENİ EKLENEN: Reklamlar kaldırıldı mı (Premium)?
            isPremium: false,

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

            // Paketin kilidini açan fonksiyon
            unlockThemeBundle: () => set({ isThemeBundlePurchased: true }),

            // YENİ EKLENEN: Premium durumunu güncelleyen fonksiyon
            setPremiumStatus: (status) => set({ isPremium: status }),

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
            // GÜNCELLENDİ: isPremium durumu da artık telefona kaydediliyor
            partialize: (state) => ({
                settings: state.settings,
                isThemeBundlePurchased: state.isThemeBundlePurchased,
                isPremium: state.isPremium
            }),
        }
    )
);

export default useGameStore;