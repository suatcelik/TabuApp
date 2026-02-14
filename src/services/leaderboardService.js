import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
} from "firebase/firestore";
import { db } from "../services/firebaseConfig";

export const saveScore = async (name, score) => {
    await addDoc(collection(db, "leaderboard"), {
        name,
        score,
        createdAt: new Date(),
    });
};

export const getTopScores = async () => {
    const q = query(
        collection(db, "leaderboard"),
        orderBy("score", "desc"),
        limit(10)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data());
};
