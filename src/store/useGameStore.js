import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLocale } from '../i18n';

const useGameStore = create(
    persist(
        (set, get) => ({
            settings: {
                duration: 60,
                maxPass: 3,
                vibration: true,
                sound: true,
                teamAName: 'Takım A',
                teamBName: 'Takım B',
                roundsPerTeam: 4,
                selectedTheme: 'default',
                language: null, // null → auto-detect from device on first launch
                teamAColor: 'fuchsia',
                teamBColor: 'sky',
            },

            isThemeBundlePurchased: false,
            isPremium: false,
            isExtraWordsPurchased: false,

            // Simple local leaderboard
            leaderboard: [],

            // Flags
            hasSeenOnboarding: false,

            // Last game snapshot (for Home "last game" card)
            lastGame: null,

            // Hydration flag (true once persisted state is restored)
            _hasHydrated: false,
            setHasHydrated: (v) => set({ _hasHydrated: !!v }),

            updateSettings: (newSettings) => {
                set((state) => {
                    const merged = { ...state.settings, ...newSettings };
                    if (merged.roundsPerTeam) {
                        merged.roundsPerTeam = Math.max(1, Number(merged.roundsPerTeam) || 1);
                    }
                    if (newSettings?.language !== undefined) {
                        setLocale(merged.language);
                    }
                    return { settings: merged };
                });
            },

            unlockThemeBundle: () => set({ isThemeBundlePurchased: true }),
            setPremiumStatus: (status) => set({ isPremium: status }),
            unlockExtraWords: () => set({ isExtraWordsPurchased: true }),

            setOnboardingSeen: () => set({ hasSeenOnboarding: true }),

            // Final game score (transient display)
            finalScores: { A: 0, B: 0 },

            setFinalScores: (scores) => {
                const next = {
                    A: Number(scores?.A ?? 0),
                    B: Number(scores?.B ?? 0),
                };
                set({ finalScores: next });
            },

            resetGame: () => set({ finalScores: { A: 0, B: 0 } }),

            // Leaderboard
            addLeaderboardEntry: (entry) => {
                set((state) => {
                    const row = {
                        teamAName: entry.teamAName || 'Takım A',
                        teamBName: entry.teamBName || 'Takım B',
                        scoreA: Number(entry.scoreA ?? 0),
                        scoreB: Number(entry.scoreB ?? 0),
                        winner: entry.winner || 'Draw',
                        date: entry.date || Date.now(),
                    };
                    const next = [row, ...(state.leaderboard || [])]
                        .slice(0, 50); // keep last 50, display top-10
                    return { leaderboard: next, lastGame: row };
                });
            },

            clearLeaderboard: () => set({ leaderboard: [] }),
        }),
        {
            name: 'GAME_SETTINGS_STORAGE',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                settings: state.settings,
                isThemeBundlePurchased: state.isThemeBundlePurchased,
                isPremium: state.isPremium,
                isExtraWordsPurchased: state.isExtraWordsPurchased,
                leaderboard: state.leaderboard,
                hasSeenOnboarding: state.hasSeenOnboarding,
                lastGame: state.lastGame,
            }),
            onRehydrateStorage: () => (state) => {
                // Sync i18n locale once hydration finishes
                try {
                    setLocale(state?.settings?.language);
                } catch (_) { }
                try {
                    state?.setHasHydrated?.(true);
                } catch (_) { }
            },
        }
    )
);

export default useGameStore;
