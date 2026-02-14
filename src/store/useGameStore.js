import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'GAME_SETTINGS';

const useGameStore = create((set, get) => ({
    // --- AYARLAR (PERSIST) ---
    settings: {
        duration: 60,
        maxPass: 3,
        vibration: true,
        teamAName: 'Takım A',
        teamBName: 'Takım B',

        // ✅ YENİ: Takım başına tur sayısı (Toplam tur = 2 * roundsPerTeam)
        roundsPerTeam: 4,
    },

    // Ayarları yükle
    loadSettings: async () => {
        try {
            const raw = await AsyncStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);

                // ✅ Güvenli normalize (eski kayıtlarda roundsPerTeam yoksa default kalsın)
                const normalized = {
                    ...parsed,
                    roundsPerTeam:
                        parsed?.roundsPerTeam == null
                            ? undefined
                            : Math.max(1, Number(parsed.roundsPerTeam) || 1),
                };

                set((state) => ({ settings: { ...state.settings, ...normalized } }));
            }
        } catch (error) {
            console.log('Settings load error:', error);
        }
    },

    // Ayarları kaydet ve güncelle
    updateSettings: async (newSettings) => {
        set((state) => {
            const merged = { ...state.settings, ...newSettings };

            // ✅ roundsPerTeam normalize
            const updated = {
                ...merged,
                roundsPerTeam: Math.max(1, Number(merged.roundsPerTeam) || 1),
            };

            // Arka planda kaydet
            AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)).catch((err) =>
                console.log('Settings save error:', err)
            );

            return { settings: updated };
        });
    },

    // --- OYUN SONU SKORU (CROSS-SCREEN) ---
    finalScores: { A: 0, B: 0 },

    setFinalScores: (scores) => {
        // Güvenli merge + sayı normalize
        const next = {
            A: Number(scores?.A ?? 0),
            B: Number(scores?.B ?? 0),
        };
        set({ finalScores: next });
    },

    resetGame: () => set({ finalScores: { A: 0, B: 0 } }),
}));

export default useGameStore;
