// src/services/wordService.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./firebaseConfig";
import { collection, getDocs, query, limit, orderBy } from "firebase/firestore";

// ✅ Local fallback
import fallbackWords from "../data/wordsFallback";

const WORDS_CACHE_KEY = "WORDS_CACHE_V1";
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withTimeout = (promise, ms, label = "TIMEOUT") =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label}_${ms}ms`)), ms)
    ),
  ]);

async function retry(fn, times = 2, delayMs = 600) {
  let lastErr;
  for (let i = 0; i <= times; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < times) await sleep(delayMs);
    }
  }
  throw lastErr;
}

/**
 * ✅ In-memory cache (en büyük performans kazanımı)
 * - App açıkken tekrar tekrar AsyncStorage okumayı ve JSON.parse'ı önler.
 */
let memCache = {
  version: null,
  fetchedAt: 0,
  words: null,
};

/**
 * Firestore'dan toplu kelime çeker
 * - Deterministik: createdAt'e göre sıralı
 */
export const getWordBatch = async (count = 100) => {
  if (!db) return [];

  const wordsCol = collection(db, "words");
  const q = query(wordsCol, orderBy("createdAt", "desc"), limit(count));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return [];

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() || {}),
  }));
};

/**
 * (Opsiyonel) Cache'e yazmadan önce sadeleştir.
 * Eğer Firestore dokümanlarında gereksiz alanlar varsa buradan kırpabilirsin.
 * Şimdilik sadece gerekli alanları koruyacak şekilde örnek bıraktım.
 */
const normalizeWords = (words) => {
  if (!Array.isArray(words)) return [];
  return words.map((w) => ({
    id: w.id,
    targetWord: w.targetWord,
    forbiddenWords: Array.isArray(w.forbiddenWords) ? w.forbiddenWords : [],
    // Eğer başka alanlar gerekiyorsa buraya ekle (ör. lang, category)
  }));
};

/**
 * ✅ Offline-first loader
 * Öncelik:
 * 1) Memory cache (en hızlı)
 * 2) AsyncStorage cache (TTL + version)
 * 3) Firestore (timeout + retry)
 * 4) Local fallback
 */
export const loadWordsOfflineFirst = async (count = 200) => {
  const now = Date.now();

  // 1) Memory cache
  try {
    const okVersion = memCache.version === CACHE_VERSION;
    const notExpired = now - (memCache.fetchedAt || 0) < CACHE_TTL_MS;
    const hasWords = Array.isArray(memCache.words) && memCache.words.length > 0;

    if (okVersion && notExpired && hasWords) {
      return { words: memCache.words, source: "memory" };
    }
  } catch (_) {}

  // 2) AsyncStorage cache
  try {
    const cachedRaw = await AsyncStorage.getItem(WORDS_CACHE_KEY);
    if (cachedRaw && cachedRaw !== "undefined") {
      const cached = JSON.parse(cachedRaw);

      const okVersion = cached?.version === CACHE_VERSION;
      const fetchedAt = cached?.fetchedAt || 0;
      const notExpired = now - fetchedAt < CACHE_TTL_MS;
      const hasWords = Array.isArray(cached?.words) && cached.words.length > 0;

      if (okVersion && notExpired && hasWords) {
        // ✅ memory'ye koy (bir daha parse yok)
        memCache = {
          version: CACHE_VERSION,
          fetchedAt,
          words: cached.words,
        };

        return { words: cached.words, source: "cache" };
      }
    }
  } catch (_) {
    // cache bozuksa sessiz devam
  }

  // 3) Firestore (timeout + retry)
  try {
    const fresh = await retry(
      () => withTimeout(getWordBatch(count), 8000, "FIRESTORE_TIMEOUT"),
      2,
      700
    );

    if (Array.isArray(fresh) && fresh.length > 0) {
      // ✅ İstersen sadeleştirerek cache boyutunu küçült
      const normalized = normalizeWords(fresh);

      // AsyncStorage'a yaz
      try {
        const payload = {
          version: CACHE_VERSION,
          fetchedAt: now,
          words: normalized,
        };
        await AsyncStorage.setItem(WORDS_CACHE_KEY, JSON.stringify(payload));
      } catch (_) {}

      // ✅ memory'ye yaz
      memCache = {
        version: CACHE_VERSION,
        fetchedAt: now,
        words: normalized,
      };

      return { words: normalized, source: "firestore" };
    }
  } catch (_) {
    // timeout / internet / izin vs
  }

  // 4) Local fallback
  if (Array.isArray(fallbackWords) && fallbackWords.length > 0) {
    // ✅ memory'ye yaz (tekrar tekrar array oluşturma)
    memCache = {
      version: CACHE_VERSION,
      fetchedAt: now,
      words: fallbackWords,
    };
    return { words: fallbackWords, source: "local" };
  }

  throw new Error("NO_WORD_SOURCE_AVAILABLE");
};

export const clearWordsCache = async () => {
  try {
    await AsyncStorage.removeItem(WORDS_CACHE_KEY);
  } catch (_) {}
  // memory'yi de temizle
  memCache = { version: null, fetchedAt: 0, words: null };
};