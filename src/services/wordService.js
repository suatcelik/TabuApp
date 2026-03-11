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
const FIRESTORE_TIMEOUT_MS = 5000;

// FIX: isExtraPurchased alanı eklendi.
// Memory cache hangi satın alma durumuyla doldurulduğunu artık biliyor.
// loadWordsOfflineFirst başında bu değer store'daki güncel değerle karşılaştırılır;
// farklıysa (örn. kullanıcı ekstra paketi satın aldı) memory cache bypass edilerek
// Firestore'dan taze veri çekilir.
let memCache = {
  version: null,
  fetchedAt: 0,
  words: null,
  isExtraPurchased: false,
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

  // Store'dan kullanıcının paketi satın alıp almadığını kontrol et
  const isExtraPurchased = useGameStore.getState().isExtraWordsPurchased;

  // 1) Memory Cache (En Hızlı)
  // FIX: Cache geçerli sayılabilmesi için isExtraPurchased değerinin
  // cache'in doldurulduğu andaki değerle eşleşmesi gerekiyor.
  // Farklıysa (satın alma gerçekleşti) cache bypass edilip taze veri çekilir.
  const memCacheValid =
    memCache.words &&
    memCache.words.length > 0 &&
    memCache.isExtraPurchased === isExtraPurchased;

  if (memCacheValid) {
    return { words: memCache.words, source: "memory" };
  }

  // 2) AsyncStorage Cache (Disk)
  try {
    const cachedRaw = await AsyncStorage.getItem(WORDS_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      const notExpired = now - (cached.fetchedAt || 0) < CACHE_TTL_MS;

      // FIX: Disk cache de aynı şekilde isExtraPurchased değeri eşleşmeli.
      // Satın alma sonrası clearWordsCache() disk cache'i zaten temizliyor,
      // bu kontrol ek güvence sağlar (örn. clearWordsCache çağrısı başarısız olduysa).
      const purchaseStateMatches = cached.isExtraPurchased === isExtraPurchased;

      if (notExpired && purchaseStateMatches && cached.words?.length > 0) {
        memCache = { ...cached, version: CACHE_VERSION };
        return { words: cached.words, source: "cache" };
      }
    }
  } catch (_) { }

  // 3) Firestore (İnternet) - Kısa Timeout ile Dene
  try {
    console.log("Firestore'dan veri çekiliyor...");

    const fresh = await withTimeout(getWordBatch(isExtraPurchased), FIRESTORE_TIMEOUT_MS);

    if (Array.isArray(fresh) && fresh.length > 0) {
      const normalized = normalizeWords(fresh);

      // FIX: Cache payload'a isExtraPurchased kaydediliyor.
      // Böylece bir sonraki çağrıda hangi durumla doldurulduğu bilinir.
      const payload = {
        version: CACHE_VERSION,
        fetchedAt: now,
        words: normalized,
        isExtraPurchased,
      };
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

  // FIX: Local veri cache'e yazılırken de isExtraPurchased kaydediliyor.
  memCache = {
    version: CACHE_VERSION,
    fetchedAt: now,
    words: localData,
    isExtraPurchased,
  };

  return { words: localData, source: "local" };
};

export const clearWordsCache = async () => {
  try { await AsyncStorage.removeItem(WORDS_CACHE_KEY); } catch (_) { }
  memCache = { version: null, fetchedAt: 0, words: null, isExtraPurchased: false };
};