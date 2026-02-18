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
                roundsPerTeam: 4, // Varsayılan tur sayısı
            },

            // Ayarları güncelle (Otomatik olarak AsyncStorage'a yazar)
            updateSettings: (newSettings) => {
                set((state) => {
                    // Gelen veriyi birleştir
                    const merged = { ...state.settings, ...newSettings };

                    // Güvenlik: roundsPerTeam sayısal ve en az 1 olmalı
                    if (merged.roundsPerTeam) {
                        merged.roundsPerTeam = Math.max(1, Number(merged.roundsPerTeam) || 1);
                    }

                    return { settings: merged };
                });
            },

            // --- OYUN SONU SKORU (Kaydedilmez, RAM'de durur) ---
            finalScores: { A: 0, B: 0 },

            setFinalScores: (scores) => {
                const next = {
                    A: Number(scores?.A ?? 0),
                    B: Number(scores?.B ?? 0),
                };
                set({ finalScores: next });
            },

            // Yeni oyun için skorları sıfırla
            resetGame: () => set({ finalScores: { A: 0, B: 0 } }),
        }),
        {
            name: 'GAME_SETTINGS_STORAGE', // AsyncStorage'daki anahtar ismi
            storage: createJSONStorage(() => AsyncStorage), // Depolama motoru

            // ÖNEMLİ: Sadece 'settings' objesini kaydet, skorları kaydetme.
            partialize: (state) => ({ settings: state.settings }),
        }
    )
);

export default useGameStore;