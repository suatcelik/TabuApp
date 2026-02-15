import { db } from "./firebaseConfig";
import { collection, getDocs, query, limit, orderBy } from "firebase/firestore";

/**
 * Firestore'dan toplu kelime çeker
 * - Deterministik: createdAt'e göre sıralı
 * - Randomlık: GameScreen'deki Fisher–Yates shuffle ile sağlanıyor
 */
export const getWordBatch = async (count = 100) => {
    try {
        if (!db) {
            console.error("❌ Firebase DB is not initialized!");
            return [];
        }

        const wordsCol = collection(db, "words");

        // 🔥 Backfill yapıldığı için artık güvenli
        const q = query(
            wordsCol,
            orderBy("createdAt", "desc"),
            limit(count)
        );

        const snapshot = await getDocs(q);

        console.log("Fetched documents from Firebase:", snapshot.size);

        if (snapshot.empty) {
            console.warn("⚠️ Firestore 'words' koleksiyonu boş.");
            return [];
        }

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() || {}),
        }));

    } catch (error) {
        console.error("❌ Kelime paketi çekilemedi:", error);
        return [];
    }
};
