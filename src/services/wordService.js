import { db } from './firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Firestore'dan tüm kelimeleri çeker ve içlerinden rastgele birini döndürür.
 */
export const getRandomWord = async () => {
    try {
        // 1. 'words' koleksiyonuna referans al
        const wordsCol = collection(db, 'words');

        // 2. Koleksiyondaki tüm dökümanları getir
        const wordSnapshot = await getDocs(wordsCol);

        // 3. Dökümanları düz bir dizi (array) haline getir
        const wordList = wordSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // 4. Eğer veritabanı boşsa hata vermemesi için kontrol et
        if (wordList.length === 0) {
            console.warn("⚠️ Veritabanında hiç kelime bulunamadı!");
            return {
                targetWord: "Koleksiyon Boş",
                forbiddenWords: ["Kelime", "Ekleyin", "Firebase", "Firestore", "Hata"]
            };
        }

        // 5. Rastgele bir index seç ve o kelimeyi döndür
        const randomIndex = Math.floor(Math.random() * wordList.length);
        return wordList[randomIndex];

    } catch (error) {
        console.error("❌ Firebase'den kelime çekilirken hata oluştu:", error);
        // Hata durumunda uygulamanın çökmemesi için geçici bir kelime döndür
        return {
            targetWord: "HATA OLUŞTU",
            forbiddenWords: ["İnternet", "Bağlantı", "Firebase", "Firestore", "Kod"]
        };
    }
};