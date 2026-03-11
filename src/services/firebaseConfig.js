import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBSlx11bpMkZX-ZGwAcKMEopGtTIp59SFk",
    authDomain: "tabuapp-492a8.firebaseapp.com",
    projectId: "tabuapp-492a8",
    storageBucket: "tabuapp-492a8.firebasestorage.app",
    messagingSenderId: "968460844342",
    appId: "1:968460844342:web:2b34694072be8fef9e8797",
    measurementId: "G-V8CE6SNYV0"
};

// Uygulama zaten başlatıldıysa tekrar başlatma
const app = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

// Firestore: zaten init edildiyse getFirestore, değilse initializeFirestore
let db;
try {
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
    });
} catch (e) {
    // "already initialized" hatası → mevcut instance'ı al
    db = getFirestore(app);
}

export { db };