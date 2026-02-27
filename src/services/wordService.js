import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./firebaseConfig";
import { collection, getDocs } from "firebase/firestore"; // limit, query ve orderBy kaldırıldı
import useGameStore from "../store/useGameStore"; // YENİ: Store import edildi

// ✅ Local fallback
import fallbackWords from "../data/wordsFallback";

const WORDS_CACHE_KEY = "WORDS_CACHE_V1";
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat

// Timeout süresini 8000ms'den 2500ms'ye düşürdük.
// Eğer internet yavaşsa kullanıcıyı bekletme, direkt local veriyi aç.
const FIRESTORE_TIMEOUT_MS = 2500;

let memCache = {
  version: null,
  fetchedAt: 0,
  words: null,
};

// YENİ: Firebase'den tüm kelimeleri çekip telefonda harmanlayan fonksiyon
export const getWordBatch = async (isExtraPurchased = false) => {
  if (!db) return [];

  try {
    // 1. Ücretsiz kelimelerin TAMAMINI çek (limit ve tarih sıralaması yok)
    const wordsCol = collection(db, "words");
    const snapshot = await getDocs(wordsCol);
    let allWords = snapshot.empty ? [] : snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // 2. Eğer paket satın alındıysa ekstra kelimelerin TAMAMINI çek ve birleştir
    if (isExtraPurchased) {
      const extraCol = collection(db, "extra_words");
      const extraSnapshot = await getDocs(extraCol);
      const extraWords = extraSnapshot.empty ? [] : extraSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Havuzları birleştir
      allWords = [...allWords, ...extraWords];
    }

    // 3. Kelimelerin TÜMÜNÜ rastgele karıştır!
    return allWords.sort(() => Math.random() - 0.5);

  } catch (error) {
    console.log("Firestore çekme hatası:", error);
    return [];
  }
};

const normalizeWords = (words) => {
  if (!Array.isArray(words)) return [];
  return words.map((w) => ({
    id: w.id || Math.random().toString(), // ID yoksa uydur
    targetWord: w.targetWord,
    forbiddenWords: Array.isArray(w.forbiddenWords) ? w.forbiddenWords : [],
  }));
};

// Promise Timeout Yardımcısı
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), ms)
    ),
  ]);

// count parametresine artık gerek yok, kaldırdık.
export const loadWordsOfflineFirst = async () => {
  const now = Date.now();

  // YENİ: Store'dan kullanıcının paketi satın alıp almadığını kontrol et
  const isExtraPurchased = useGameStore.getState().isExtraWordsPurchased;

  // 1) Memory Cache (En Hızlı)
  if (memCache.words && memCache.words.length > 0) {
    return { words: memCache.words, source: "memory" };
  }

  // 2) AsyncStorage Cache (Disk)
  try {
    const cachedRaw = await AsyncStorage.getItem(WORDS_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      const notExpired = now - (cached.fetchedAt || 0) < CACHE_TTL_MS;

      if (notExpired && cached.words?.length > 0) {
        memCache = { ...cached, version: CACHE_VERSION };
        return { words: cached.words, source: "cache" };
      }
    }
  } catch (_) { }

  // 3) Firestore (İnternet) - Kısa Timeout ile Dene
  try {
    console.log("Firestore'dan veri çekiliyor...");

    // YENİ: isExtraPurchased parametresini gönderiyoruz
    const fresh = await withTimeout(getWordBatch(isExtraPurchased), FIRESTORE_TIMEOUT_MS);

    if (Array.isArray(fresh) && fresh.length > 0) {
      const normalized = normalizeWords(fresh);

      // Cache'e kaydet
      const payload = { version: CACHE_VERSION, fetchedAt: now, words: normalized };
      AsyncStorage.setItem(WORDS_CACHE_KEY, JSON.stringify(payload)).catch(() => { });
      memCache = payload;

      return { words: normalized, source: "firestore" };
    }
  } catch (e) {
    console.log("Firestore hatası veya timeout, fallback'e geçiliyor:", e.message);
    // Hata oluşursa hemen aşağıya (fallback'e) düşer
  }

  // 4) Local Fallback (Son Çare - HATA VERME, BUNU DÖN)
  // Kullanıcıyı asla boş ekranda bırakma
  console.log("Local veri kullanılıyor.");
  const localData = normalizeWords(fallbackWords);

  // Local veriyi de memory'ye al ki bir sonraki turda tekrar parse etmesin
  memCache = {
    version: CACHE_VERSION,
    fetchedAt: now,
    words: localData
  };

  return { words: localData, source: "local" };
};

export const clearWordsCache = async () => {
  try { await AsyncStorage.removeItem(WORDS_CACHE_KEY); } catch (_) { }
  memCache = { version: null, fetchedAt: 0, words: null };
};