import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase Console -> Proje Ayarları -> General altındaki SDK Setup'tan alacağın bilgiler:
const firebaseConfig = {
    apiKey: "AIzaSyBSlx11bpMkZX-ZGwAcKMEopGtTIp59SFk",
    authDomain: "tabuapp-492a8.firebaseapp.com",
    projectId: "tabuapp-492a8",
    storageBucket: "tabuapp-492a8.firebasestorage.app",
    messagingSenderId: "968460844342",
    appId: "1:968460844342:web:2b34694072be8fef9e8797",
    measurementId: "G-V8CE6SNYV0"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Veritabanı (Firestore) referansını oluştur ve dışa aktar
export const db = getFirestore(app);