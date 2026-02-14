import { db } from "./firebaseConfig";
import { collection, getDocs, query, limit, orderBy } from "firebase/firestore";

/**
 * Firestore'dan toplu kelime çeker (Oyun başında bir kez çalışır)
 * ✅ Deterministik: createdAt alanına göre sıralı çeker
 *
 * Not: Kelimeleri karıştırma işini GameScreen zaten Fisher–Yates ile yapıyor.
 */
export const getWordBatch = async (count = 100) => {
    try {
        if (!db) {
            console.error("❌ Firebase DB is not initialized!");
            return [];
        }

        const wordsCol = collection(db, "words");
        console.log("Firebase collection 'words' target successfully.");

        // ✅ Deterministik + garanti sıralama
        // createdAt yoksa bu sorgu hata verir; bu yüzden mevcut dokümanlara createdAt backfill yapmalısın.
        const q = query(wordsCol, orderBy("createdAt", "desc"), limit(count));

        const wordSnapshot = await getDocs(q);
        console.log("Fetched documents from Firebase:", wordSnapshot.docs.length);

        const wordList = wordSnapshot.docs.map((doc) => {
            const data = doc.data();
            if (!data) console.warn("Document data is undefined for ID:", doc.id);
            return {
                id: doc.id,
                ...(data || {}),
            };
        });

        if (wordList.length === 0) {
            return [
                {
                    targetWord: "Kelimeler Hazırlanıyor",
                    forbiddenWords: ["Lütfen", "Bekleyin", "Yükleniyor"],
                },
            ];
        }

        // ❌ Burada sort(Math.random) kaldırıldı (deterministik istiyoruz)
        // Randomlık: GameScreen shuffleWords() zaten yapıyor.
        return wordList;
    } catch (error) {
        console.error("❌ Kelime paketi çekilemedi:", error);

        // Eğer createdAt yoksa Firestore genelde burada "The query requires an index" ya da
        // "no matching index" değil; daha çok "orderBy field does not exist" tarzı bir durum olur.
        // Bu durumda geçici fallback olarak orderBy'sız çekebiliriz:
        try {
            console.log("⚠️ Fallback: orderBy olmadan çekiliyor...");
            const wordsCol = collection(db, "words");
            const q2 = query(wordsCol, limit(count));
            const snap2 = await getDocs(q2);
            const list2 = snap2.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));

            if (list2.length === 0) {
                return [
                    {
                        targetWord: "Kelimeler Hazırlanıyor",
                        forbiddenWords: ["Lütfen", "Bekleyin", "Yükleniyor"],
                    },
                ];
            }
            return list2;
        } catch (e2) {
            console.error("❌ Fallback da başarısız:", e2);
            return [];
        }
    }
};
