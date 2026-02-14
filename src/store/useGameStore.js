import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWordBatch } from '../services/wordService';

const SETTINGS_KEY = "GAME_SETTINGS";

const useGameStore = create((set, get) => ({
    // --- BAŞLANGIÇ AYARLARI ---
    settings: {
        duration: 60,
        maxPass: 3,
        vibration: true,
        teamAName: "Takım A",
        teamBName: "Takım B",
    },

    // --- OYUN DURUMU (STATE) ---
    totalScores: { A: 0, B: 0 },
    currentTeam: 'A',    // Sıradaki takım
    currentScore: 0,     // O anki aktif turun puanı
    passCount: 0,        // O anki turda kullanılan pas

    // --- KELİME YÖNETİMİ ---
    wordPool: [],      // Firebase'den gelen 100 kelimelik havuz
    currentWord: null, // Ekranda görünen aktif kelime
    isLoading: false,

    // --- AYAR VE SKOR FONKSİYONLARI ---

    // Ayarları yükle
    loadSettings: async () => {
        try {
            const raw = await AsyncStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                set((state) => ({ settings: { ...state.settings, ...parsed } }));
            }
        } catch (error) {
            console.log("Settings load error:", error);
        }
    },

    // Ayarları kaydet ve güncelle
    updateSettings: async (newSettings) => {
        set((state) => {
            const updated = { ...state.settings, ...newSettings };
            // Arka planda kaydet
            AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)).catch(err =>
                console.log("Settings save error:", err)
            );
            return { settings: updated };
        });
    },

    // Tur bitince mevcut puanı ilgili takıma ekler
    finalizeTurn: () => {
        const { currentTeam, currentScore, totalScores } = get();
        set({
            totalScores: {
                ...totalScores,
                [currentTeam]: totalScores[currentTeam] + currentScore
            },
            currentScore: 0, // Yeni tur için sıfırla
            passCount: 0,    // Yeni tur için sıfırla
            currentTeam: currentTeam === 'A' ? 'B' : 'A' // Takım değiştir
        });
    },

    // Skorları doğrudan set eder (Reducer ile senkronizasyon için)
    setFinalScores: (scores) => set({ totalScores: scores }),

    // --- PERFORMANS VE OYUN MANTIĞI ---

    // 1. Oyun Başında Kelimeleri Havuza Doldur (Hız için kritik)
    prepareGame: async () => {
        set({ isLoading: true });
        try {
            // Firebase'den 100 kelimeyi tek seferde çekiyoruz (Takılmayı önler)
            const batch = await getWordBatch(100);
            if (batch && batch.length > 0) {
                set({
                    wordPool: batch,
                    currentWord: batch[0],
                    isLoading: false
                });
            }
        } catch (error) {
            console.error("Oyun hazırlanırken hata:", error);
            set({ isLoading: false });
        }
    },

    // 2. Kelime Değiştirme (RAM üzerinden anlık çalışır)
    nextWord: () => {
        const { wordPool } = get();
        if (wordPool.length > 1) {
            const newPool = wordPool.slice(1); // Kullanılan kelimeyi diziden at
            set({
                wordPool: newPool,
                currentWord: newPool[0]
            });
        } else {
            // Havuz kritik seviyeye inerse (son kelime) yeni paket çek
            get().prepareGame();
        }
    },

    // 3. Aksiyon Fonksiyonları (Doğru / Tabu / Pas)
    handleCorrect: () => {
        const { settings } = get();
        if (settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        set((state) => ({ currentScore: state.currentScore + 1 }));
        get().nextWord();
    },

    handleTaboo: () => {
        const { settings } = get();
        if (settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        set((state) => ({ currentScore: state.currentScore - 1 }));
        get().nextWord();
    },

    handlePass: () => {
        const { passCount, settings } = get();
        if (passCount < settings.maxPass) {
            if (settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            set((state) => ({ passCount: state.passCount + 1 }));
            get().nextWord();
            return true;
        }
        // Pas hakkı bittiyse ufak bir uyarı titreşimi verilebilir
        if (settings.vibration) Haptics.selectionAsync();
        return false;
    },

    // --- SIFIRLAMA ---
    resetGame: () => set({
        totalScores: { A: 0, B: 0 },
        currentScore: 0,
        passCount: 0,
        currentTeam: 'A'
    }),
}));

export default useGameStore;
