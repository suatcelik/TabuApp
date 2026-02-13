import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { getWordBatch } from '../services/wordService';

const useGameStore = create((set, get) => ({
    // --- BAŞLANGIÇ AYARLARI ---
    settings: {
        duration: 60,
        maxPass: 3,
        vibration: true,
    },

    // --- OYUN DURUMU (STATE) ---
    totalScores: { A: 0, B: 0 },
    currentTeam: 'A',    // Sıradaki takım
    currentScore: 0,     // O anki aktif turun puanı
    passCount: 0,        // Kullanılan pas sayısı

    // --- KELİME VE HATA YÖNETİMİ ---
    wordPool: [],      // Firebase'den gelen kelime havuzu
    currentWord: null, // Ekranda görünen aktif kelime
    isLoading: false,  // Yüklenme durumu
    error: null,       // Hata mesajı (Network vb.)

    // --- AYAR VE SKOR FONKSİYONLARI ---
    setSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),

    // Tur bittiğinde çağrılır: Puanı takıma ekler ve sırayı değiştirir
    finalizeTurn: () => {
        const { currentTeam, currentScore, totalScores } = get();
        set({
            totalScores: {
                ...totalScores,
                [currentTeam]: totalScores[currentTeam] + currentScore
            },
            currentScore: 0,
            passCount: 0,
            currentTeam: currentTeam === 'A' ? 'B' : 'A'
        });
    },

    // --- PERFORMANS VE OYUN MANTIĞI ---

    // 1. Oyun Başında Kelimeleri Havuza Doldur (Hata Yönetimli)
    prepareGame: async () => {
        set({ isLoading: true, error: null }); // Başlarken hatayı temizle
        try {
            // Firebase'den 100 kelimeyi tek seferde çekiyoruz (Hız sağlar)
            const batch = await getWordBatch(100);

            if (batch && batch.length > 0) {
                set({
                    wordPool: batch,
                    currentWord: batch[0],
                    isLoading: false,
                    error: null
                });
            } else {
                set({
                    error: "Kelimeler yüklenemedi. Veritabanı boş görünüyor.",
                    isLoading: false
                });
            }
        } catch (err) {
            console.error("Oyun hazırlanırken hata:", err);
            set({
                error: "Bağlantı hatası! Lütfen internetinizi kontrol edin.",
                isLoading: false
            });
        }
    },

    // 2. Kelime Değiştirme (Hafızadan anlık çalışır)
    nextWord: () => {
        const { wordPool } = get();
        if (wordPool.length > 1) {
            const newPool = wordPool.slice(1); // Kullanılan kelimeyi at
            set({
                wordPool: newPool,
                currentWord: newPool[0]
            });
        } else {
            // Havuz biterse yeni paket çek
            get().prepareGame();
        }
    },

    // 3. Aksiyon Fonksiyonları (Doğru / Tabu / Pas)
    handleCorrect: () => {
        const { settings } = get();
        // Doğru titreşimi
        if (settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        set((state) => ({ currentScore: state.currentScore + 1 }));
        get().nextWord();
    },

    handleTaboo: () => {
        const { settings } = get();
        // Tabu/Hata titreşimi
        if (settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        set((state) => ({ currentScore: state.currentScore - 1 }));
        get().nextWord();
    },

    handlePass: () => {
        const { passCount, settings } = get();
        if (passCount < settings.maxPass) {
            // Hafif vuruş titreşimi
            if (settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            set((state) => ({ passCount: state.passCount + 1 }));
            get().nextWord();
            return true;
        }
        // Pas bittiyse uyarı titreşimi
        if (settings.vibration) Haptics.selectionAsync();
        return false;
    },

    // --- RESET ---
    resetGame: () => set({
        totalScores: { A: 0, B: 0 },
        currentScore: 0,
        passCount: 0,
        currentTeam: 'A',
        error: null,
        wordPool: [],
        currentWord: null
    }),
}));

export default useGameStore;