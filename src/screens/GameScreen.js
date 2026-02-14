import React, { useEffect, useReducer, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAudioPlayer } from "expo-audio";

import { getWordBatch } from "../services/wordService";
import { gameReducer, initialState } from "../reducers/gameReducer";
import { saveScore } from "../services/leaderboardService";
import { logRoundEnd } from "../services/analyticsService";
import useGameStore from "../store/useGameStore";

export default function GameScreen({ navigation }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const { settings, loadSettings, setFinalScores } = useGameStore();

    // ✅ expo-audio: sesleri bir kez yükler
    const successPlayer = useAudioPlayer(require("../../assets/success.mp3"));
    const errorPlayer = useAudioPlayer(require("../../assets/error.mp3"));

    const playSound = (type) => {
        try {
            if (type === "SUCCESS") {
                successPlayer.seekTo?.(0);
                successPlayer.play();
            } else {
                errorPlayer.seekTo?.(0);
                errorPlayer.play();
            }
        } catch (e) {
            console.log("Ses hatası:", e);
        }
    };

    // UI tarafında modal/round kontrolü
    const [round, setRound] = useState(1);

    // 1) Oyun hazırlığı: ayarları yükle + kelimeleri yükle
    useEffect(() => {
        const initGame = async () => {
            try {
                await loadSettings();

                const cached = await AsyncStorage.getItem("WORDS");

                if (cached && cached !== "undefined") {
                    console.log("Using cached words");
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed)) {
                        dispatch({ type: "SET_WORDS", payload: parsed });
                    } else {
                        await AsyncStorage.removeItem("WORDS");
                    }
                } else {
                    console.log("Fetching new words from Firebase...");
                    const words = await getWordBatch();
                    const wordList = Array.isArray(words) ? words : [];
                    const shuffled = wordList.sort(() => Math.random() - 0.5);

                    if (shuffled.length > 0) {
                        await AsyncStorage.setItem("WORDS", JSON.stringify(shuffled));
                    }
                    dispatch({ type: "SET_WORDS", payload: shuffled });
                }
            } catch (e) {
                console.log("CRITICAL ERROR in initGame:", e);
            }
        };

        initGame();
    }, []);

    // Ayarlar yüklendiğinde reducer'ı güncelle
    useEffect(() => {
        if (!settings) return;
        dispatch({
            type: "INIT_SETTINGS",
            payload: { duration: settings.duration, maxPass: settings.maxPass },
        });
    }, [settings?.duration, settings?.maxPass]);

    // 3) Timer
    useEffect(() => {
        if (!state.isActive) return;

        const interval = setInterval(() => {
            dispatch({ type: "TICK" });
        }, 1000);

        return () => clearInterval(interval);
    }, [state.isActive]);

    // 4) Tur bitince
    useEffect(() => {
        if (state.timeLeft === 0 && state.isActive === false && !state.isGameOver) {
            const teamScore =
                state.activeTeam === "A" ? state.teamAScore : state.teamBScore;

            logRoundEnd(state.activeTeam, teamScore);

            dispatch({
                type: "NEXT_ROUND",
                payload: { duration: settings?.duration, maxPass: settings?.maxPass },
            });
        }
    }, [
        state.timeLeft,
        state.isActive,
        state.isGameOver,
        state.activeTeam,
        state.teamAScore,
        state.teamBScore,
        settings?.duration,
        settings?.maxPass,
    ]);

    // 5) Oyun tamamen bitince
    useEffect(() => {
        if (state.isGameOver) {
            const winnerScore =
                state.teamAScore > state.teamBScore ? state.teamAScore : state.teamBScore;

            saveScore("Player", winnerScore);
            setFinalScores({ A: state.teamAScore, B: state.teamBScore });

            const timerId = setTimeout(() => {
                navigation?.replace?.("Result");
            }, 1000);

            return () => clearTimeout(timerId);
        }
    }, [state.isGameOver, state.teamAScore, state.teamBScore, navigation, setFinalScores]);

    // 6) Aksiyonlar
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

    const startNextTurn = () => {
        dispatch({ type: "START_TURN" });
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
    const activeTeamName =
        state.activeTeam === "A" ? settings?.teamAName : settings?.teamBName;

    // Timer formatı
    const timer = state.timeLeft || 0;
    const mm = Math.floor(timer / 60);
    const ss = timer % 60 < 10 ? `0${timer % 60}` : timer % 60;

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />

            {/* Üst Bilgi Çubuğu */}
            <View className="flex-row justify-between items-center px-6 py-4 bg-white shadow-sm">
                <View className="items-center flex-1">
                    <Text className="text-slate-400 text-[10px] font-bold uppercase">
                        {activeTeamName}
                    </Text>
                    <Text className="text-indigo-600 text-3xl font-black">
                        {state.activeTeam === "A" ? state.teamAScore : state.teamBScore}
                    </Text>
                </View>

                <View className="bg-indigo-600 px-6 py-2 rounded-2xl shadow-lg shadow-indigo-200 mx-4">
                    <Text className="text-white font-black text-xl">
                        {mm}:{ss}
                    </Text>
                </View>

                <View className="items-center flex-1">
                    <Text className="text-slate-400 text-[10px] font-bold uppercase">Pas</Text>
                    <Text className="text-amber-500 text-3xl font-black">{state.passCount}</Text>
                </View>
            </View>

            {/* Kelime Kartı */}
            <View className="flex-1 justify-center px-8">
                <View className="bg-white rounded-[45px] shadow-2xl overflow-hidden border border-slate-100">
                    <View className="bg-indigo-500 py-10 items-center">
                        <Text className="text-white text-4xl font-black uppercase tracking-tighter text-center px-4">
                            {currentWord?.targetWord ?? "—"}
                        </Text>
                    </View>

                    <View className="py-10 items-center">
                        {(currentWord?.forbiddenWords ?? []).map((word, index) => (
                            <View key={`${word}-${index}`} className="py-2 w-full items-center">
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

            {/* Kontrol Butonları */}
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
                    className="flex-1 bg-amber-300 h-24 rounded-3xl items-center justify-center shadow-lg shadow-amber-200 active:scale-95"
                    onPress={onPass}
                    disabled={!state.isActive}
                >
                    <Ionicons name="refresh-circle" size={32} color="white" />
                    <Text className="text-white font-black uppercase mt-1">Pas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-cyan-700 h-24 rounded-3xl items-center justify-center shadow-lg shadow-emerald-200 active:scale-95"
                    onPress={onCorrect}
                    disabled={!state.isActive}
                >
                    <Ionicons name="checkmark-circle" size={32} color="white" />
                    <Text className="text-white font-black uppercase mt-1">Doğru</Text>
                </TouchableOpacity>
            </View>

            {/* Tur Değişimi Modalı */}
            <Modal
                visible={!state.isActive && !state.isGameOver && state.activeTeam === "B" && round === 1}
                transparent
                animationType="slide"
            >
                <View className="flex-1 bg-indigo-900/98 items-center justify-center px-6">
                    <View className="bg-white w-full p-8 rounded-[50px] items-center shadow-2xl">
                        <View className="bg-amber-100 p-4 rounded-full mb-4">
                            <Ionicons name="stats-chart" size={40} color="#f59e0b" />
                        </View>

                        <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">
                            Tur Sonucu
                        </Text>

                        <Text className="text-indigo-600 text-3xl font-black mb-1 text-center">
                            {settings?.teamAName}
                        </Text>
                        <Text className="text-5xl font-black text-slate-800 mb-6">{state.teamAScore}</Text>

                        <View className="w-full h-[1px] bg-slate-100 mb-6" />

                        <Text className="text-slate-500 font-bold mb-8 text-center text-lg leading-6">
                            Harika iş çıkardınız!{"\n"}Şimdi sıra{" "}
                            <Text className="text-indigo-600 font-black">{settings?.teamBName}</Text> ekibinde.
                        </Text>

                        <TouchableOpacity
                            className="bg-indigo-600 w-full py-6 rounded-3xl shadow-xl active:bg-indigo-700 active:scale-95"
                            onPress={startNextTurn}
                        >
                            <Text className="text-white font-black text-center text-xl uppercase tracking-widest">
                                {settings?.teamBName} BAŞLASIN!
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
