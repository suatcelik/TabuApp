// src/services/wordService.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./firebaseConfig";
import { collection, getDocs, query, limit, orderBy } from "firebase/firestore";

// ✅ Local fallback (internet + cache yoksa oyun yine açılır)
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
 * Firestore'dan toplu kelime çeker
 * - Deterministik: createdAt'e göre sıralı
 * - Randomlık: GameScreen'deki Fisher–Yates shuffle ile sağlanıyor
 */
export const getWordBatch = async (count = 100) => {
    if (!db) {
        // production'da console kaldırılacak; burada sadece güvenli dönüş
        return [];
    }

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
 * ✅ Offline-first loader
 * Öncelik sırası:
 * 1) Cache (AsyncStorage) — TTL + version kontrolü
 * 2) Firestore — 8sn timeout + 2 retry
 * 3) Local fallback JSON
 */
export const loadWordsOfflineFirst = async (count = 200) => {
    // 1) Cache oku
    try {
        const cachedRaw = await AsyncStorage.getItem(WORDS_CACHE_KEY);
        if (cachedRaw && cachedRaw !== "undefined") {
            const cached = JSON.parse(cachedRaw);

            const okVersion = cached?.version === CACHE_VERSION;
            const fetchedAt = cached?.fetchedAt || 0;
            const notExpired = Date.now() - fetchedAt < CACHE_TTL_MS;
            const hasWords = Array.isArray(cached?.words) && cached.words.length > 0;

            if (okVersion && notExpired && hasWords) {
                return { words: cached.words, source: "cache" };
            }
        }
    } catch (_) {
        // cache bozuksa sessizce devam
    }

    // 2) Firestore dene (timeout + retry)
    try {
        const fresh = await retry(
            () => withTimeout(getWordBatch(count), 8000, "FIRESTORE_TIMEOUT"),
            2,
            700
        );

        if (Array.isArray(fresh) && fresh.length > 0) {
            // Cache yaz
            try {
                const payload = {
                    version: CACHE_VERSION,
                    fetchedAt: Date.now(),
                    words: fresh,
                };
                await AsyncStorage.setItem(WORDS_CACHE_KEY, JSON.stringify(payload));
            } catch (_) { }

            return { words: fresh, source: "firestore" };
        }
    } catch (_) {
        // internet yok / timeout / izin hatası vs.
    }

    // 3) Local fallback
    if (Array.isArray(fallbackWords) && fallbackWords.length > 0) {
        return { words: fallbackWords, source: "local" };
    }

    // 4) Hiç kaynak yoksa
    throw new Error("NO_WORD_SOURCE_AVAILABLE");
};

/**
 * (İsteğe bağlı) Cache’i manuel temizlemek istersen
 */
export const clearWordsCache = async () => {
    try {
        await AsyncStorage.removeItem(WORDS_CACHE_KEY);
    } catch (_) { }
};
