import { db } from '../services/firebaseConfig';
import { collection, getDocs, query, limit } from 'firebase/firestore';

/**
 * Firestore'dan toplu kelime çeker (Oyun başında bir kez çalışır)
 */
export const getWordBatch = async (count = 100) => {
    try {
        const wordsCol = collection(db, 'words');

        // Rastgelelik için hepsini çekmek yerine bir limit koyabilirsin
        // Şimdilik performansı artırmak için sorguyu optimize ediyoruz
        const q = query(wordsCol, limit(count));
        const wordSnapshot = await getDocs(q);

        const wordList = wordSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

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