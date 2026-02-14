import { db } from './firebaseConfig';
import { collection, getDocs, query, limit } from 'firebase/firestore';

/**
 * Firestore'dan toplu kelime çeker (Oyun başında bir kez çalışır)
 */
export const getWordBatch = async (count = 100) => {
    try {
        if (!db) {
            console.error("❌ Firebase DB is not initialized!");
            return [];
        }
        const wordsCol = collection(db, 'words');
        console.log("Firebase collection 'words' target successfully.");

        const q = query(wordsCol, limit(count));
        const wordSnapshot = await getDocs(q);
        console.log("Fetched documents from Firebase:", wordSnapshot.docs.length);

        const wordList = wordSnapshot.docs.map(doc => {
            const data = doc.data();
            if (!data) console.warn("Document data is undefined for ID:", doc.id);
            return {
                id: doc.id,
                ...(data || {})
            };
        });

        if (wordList.length === 0) {
            return [{
                targetWord: "Kelimeler Hazırlanıyor",
                forbiddenWords: ["Lütfen", "Bekleyin", "Yükleniyor"]
            }];
        }

        // Listeyi karıştırıp döndürelim
        return wordList.sort(() => Math.random() - 0.5);

    } catch (error) {
        console.error("❌ Kelime paketi çekilemedi:", error);
        return [];
    }
};