import React, { useEffect, useReducer, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Modal,
    StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import { getWordBatch } from "../services/wordService";
import { gameReducer, initialState } from "../reducers/gameReducer";
import { saveScore } from "../services/leaderboardService";
import { logGameStart, logRoundEnd } from "../services/analyticsService";

export default function GameScreen({ navigation }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    // UI tarafında timer formatı için local state yerine reducer’daki timeLeft kullanacağız.
    // Round modal kontrolü için: reducer’da isActive false olunca modal açılır (A tur bitince).
    const [round, setRound] = useState(1);

    // 1) Oyun hazırlığı: kelimeleri yükle + oyun başlat
    useEffect(() => {
        const initGame = async () => {
            try {
                const cached = await AsyncStorage.getItem("WORDS");

                if (cached) {
                    dispatch({ type: "SET_WORDS", payload: JSON.parse(cached) });
                } else {
                    const words = await getWordBatch(); // senin servis fonksiyonun
                    const shuffled = words.sort(() => Math.random() - 0.5);
                    await AsyncStorage.setItem("WORDS", JSON.stringify(shuffled));
                    dispatch({ type: "SET_WORDS", payload: shuffled });
                }

                await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
                await logGameStart();
            } catch (e) {
                console.log("Word load error:", e);
            }
        };

        initGame();
    }, []);

    // 2) Ses çalma (UI dosyanla aynı davranış)
    async function playSound(type) {
        try {
            const { sound } = await Audio.Sound.createAsync(
                type === "SUCCESS"
                    ? require("../../assets/success.mp3")
                    : require("../../assets/error.mp3")
            );
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) sound.unloadAsync();
            });
        } catch (error) {
            console.log("Ses hatası:", error);
        }
    }

    // 3) Timer (reducer timeLeft ile)
    useEffect(() => {
        if (!state.isActive) return;

        const interval = setInterval(() => {
            dispatch({ type: "TICK" });
        }, 1000);

        return () => clearInterval(interval);
    }, [state.isActive]);

    // 4) Tur bitince (timeLeft 0) -> analytics + NEXT_ROUND + round state güncelle
    useEffect(() => {
        if (state.timeLeft === 0 && state.isActive === false) {
            const teamScore = state.activeTeam === "A" ? state.teamAScore : state.teamBScore;
            logRoundEnd(state.activeTeam, teamScore);

            // A bittiyse B’ye geçer, B bittiyse oyun biter (reducer NEXT_ROUND mantığına göre)
            dispatch({ type: "NEXT_ROUND" });

            // UI için round takibi (Modal mesajında kullanıyordun)
            setRound((r) => (r === 1 ? 2 : r));
        }
    }, [state.timeLeft, state.isActive, state.activeTeam, state.teamAScore, state.teamBScore]);

    // 5) Oyun tamamen bitince leaderboard’a kaydet (B turu bitince)
    useEffect(() => {
        // reducer’da B bittiğinde: isActive false kalır ve activeTeam "B" olur
        if (!state.isActive && state.activeTeam === "B" && state.timeLeft === 0) {
            const winnerScore =
                state.teamAScore > state.teamBScore ? state.teamAScore : state.teamBScore;

            saveScore("Player", winnerScore);

            // İstersen sonuç ekranına geç
            // navigation?.navigate?.("Result");
        }
    }, [state.isActive, state.activeTeam, state.timeLeft, state.teamAScore, state.teamBScore, navigation]);

    // 6) Aksiyonlar (UI dosyandaki butonlar)
    const onCorrect = () => {
        if (!state.isActive) return;
        dispatch({ type: "SUCCESS" });
        playSound("SUCCESS");
    };

    const onTaboo = () => {
        if (!state.isActive) return;
        dispatch({ type: "TABOO" });
        playSound("ERROR");
    };

    const onPass = () => {
        if (!state.isActive) return;
        dispatch({ type: "PASS" });
    };

    // UI’daki “HAZIRIZ” butonu: round 2’ye geçiş için
    const startNextTurn = () => {
        // Eğer reducer NEXT_ROUND zaten B’yi başlattıysa, burada ekstra bir şey yapmaya gerek kalmayabilir.
        // Ama senin UI akışın “butona basınca başlasın” diyor.
        // Bu yüzden: A turu bittiğinde reducer NEXT_ROUND ile B’yi isActive:true yapıyor.
        // Sen “modal açıldı, butona basınca devam” istiyorsan reducer’a "PAUSE/RESUME" eklemek gerekir.
        // ŞİMDİLİK pratik çözüm: A turu bitince modal gösteriyoruz ve butona basınca sadece modalı kapatmak için timeLeft>0 iken isActive zaten true olacak.
        // Eğer sende A tur biter bitmez B otomatik başlıyorsa ve modal varken sayıyorsa, söyle: sana 1 aksiyonla "WAITING_NEXT" state ekleyip tam istediğin gibi yapayım.
        // Burada yalnızca round state’i ayarlıyoruz:
        setRound(2);
    };

    if (state.loading && !state.words?.length) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    const currentWord = state.words?.[state.currentIndex];

    // Timer formatı
    const timer = state.timeLeft;
    const mm = Math.floor(timer / 60);
    const ss = timer % 60 < 10 ? `0${timer % 60}` : timer % 60;

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />

            {/* Üst Bilgi Çubuğu (UI aynen) */}
            <View className="flex-row justify-between items-center px-6 py-4 bg-white shadow-sm">
                <View className="items-center">
                    <Text className="text-slate-400 text-xs font-bold uppercase">Skor</Text>
                    <Text className="text-indigo-600 text-3xl font-black">
                        {state.activeTeam === "A" ? state.teamAScore : state.teamBScore}
                    </Text>
                </View>

                <View className="bg-indigo-600 px-6 py-2 rounded-2xl shadow-lg shadow-indigo-200">
                    <Text className="text-white font-black text-xl">
                        {mm}:{ss}
                    </Text>
                </View>

                <View className="items-center">
                    <Text className="text-slate-400 text-xs font-bold uppercase">Pas</Text>
                    <Text className="text-amber-500 text-3xl font-black">
                        {/* Senin eski UI “kullanılan pas” gösteriyordu; reducer “kalan pas” tutuyor */}
                        {state.passCount}
                    </Text>
                </View>
            </View>

            {/* Kelime Kartı (UI aynen) */}
            <View className="flex-1 justify-center px-8">
                <View className="bg-white rounded-[45px] shadow-2xl overflow-hidden border border-slate-100">
                    <View className="bg-indigo-500 py-10 items-center">
                        <Text className="text-white text-4xl font-black uppercase tracking-tighter text-center px-4">
                            {currentWord?.targetWord ?? "—"}
                        </Text>
                    </View>

                    <View className="py-10 items-center">
                        {currentWord?.forbiddenWords?.map((word, index) => (
                            <View key={index} className="py-2 w-full items-center">
                                <Text className="text-slate-600 text-2xl font-bold uppercase tracking-tight">
                                    {word}
                                </Text>
                                {index < (currentWord?.forbiddenWords?.length ?? 0) - 1 && (
                                    <View className="w-1/2 h-[1px] bg-slate-100 mt-2" />
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* Kontrol Butonları (UI aynen) */}
            <View className="flex-row justify-between px-6 pb-10 space-x-4">
                <TouchableOpacity
                    className="flex-1 bg-rose-500 h-24 rounded-3xl items-center justify-center shadow-lg shadow-rose-200 active:scale-95"
                    onPress={onTaboo}
                    disabled={!state.isActive}
                >
                    <Ionicons name="close-circle" size={32} color="white" />
                    <Text className="text-white font-black uppercase mt-1">Tabu</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-amber-400 h-24 rounded-3xl items-center justify-center shadow-lg shadow-amber-200 active:scale-95"
                    onPress={onPass}
                    disabled={!state.isActive}
                >
                    <Ionicons name="refresh-circle" size={32} color="white" />
                    <Text className="text-white font-black uppercase mt-1">Pas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-emerald-500 h-24 rounded-3xl items-center justify-center shadow-lg shadow-emerald-200 active:scale-95"
                    onPress={onCorrect}
                    disabled={!state.isActive}
                >
                    <Ionicons name="checkmark-circle" size={32} color="white" />
                    <Text className="text-white font-black uppercase mt-1">Doğru</Text>
                </TouchableOpacity>
            </View>

            {/* Tur Değişimi Modalı (UI aynen) */}
            <Modal visible={!state.isActive && round === 1} transparent animationType="fade">
                <View className="flex-1 bg-indigo-900/95 items-center justify-center px-10">
                    <View className="bg-white w-full p-10 rounded-[50px] items-center shadow-2xl">
                        <Text className="text-slate-400 font-bold uppercase mb-2">Tur Tamamlandı</Text>

                        <Text className="text-indigo-600 text-4xl font-black mb-2 text-center">
                            Takım {state.activeTeam}: {state.teamAScore}
                        </Text>

                        <Text className="text-slate-600 font-medium mb-8 text-center italic">
                            Sıra Takım {state.activeTeam === "A" ? "B" : "A"}'de!
                        </Text>

                        <TouchableOpacity
                            className="bg-indigo-600 w-full py-6 rounded-3xl shadow-xl active:bg-indigo-700"
                            onPress={startNextTurn}
                        >
                            <Text className="text-white font-black text-center text-xl uppercase tracking-widest">
                                HAZIRIZ!
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
