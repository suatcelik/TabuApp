import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import useGameStore from "../store/useGameStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAudioPlayer } from "expo-audio";

export default function ResultScreen({ navigation }) {
    const { totalScores, settings, resetGame } = useGameStore();
    const [showConfetti, setShowConfetti] = useState(false);

    // ✅ expo-audio: kazanan sesi player (bir kez yüklenir)
    const winPlayer = useAudioPlayer(require("../../assets/success.mp3"));

    // Kazananı belirle
    const winnerKey =
        totalScores.A > totalScores.B
            ? "A"
            : totalScores.B > totalScores.A
                ? "B"
                : "Draw";

    const winnerName =
        winnerKey === "A"
            ? settings.teamAName
            : winnerKey === "B"
                ? settings.teamBName
                : "Berabere";

    const playWinSound = () => {
        try {
            winPlayer.seekTo?.(0);
            winPlayer.play();
        } catch (error) {
            console.log("Win sound error:", error);
        }
    };

    useEffect(() => {
        // Eğer bir kazanan varsa konfeti + ses
        if (winnerKey !== "Draw") {
            const timer = setTimeout(() => {
                setShowConfetti(true);
                playWinSound();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [winnerKey]);

    const handleNewGame = () => {
        resetGame();
        navigation.navigate("Home");
    };

    return (
        <SafeAreaView className="flex-1 bg-indigo-900">
            <StatusBar barStyle="light-content" />

            {/* Konfeti Efekti */}
            {showConfetti && (
                <ConfettiCannon
                    count={200}
                    origin={{ x: -10, y: 0 }}
                    fadeOut={true}
                    fallSpeed={3000}
                />
            )}

            <View className="flex-1 items-center justify-center px-6">
                {/* Taç İkonu ve Başlık */}
                <View className="bg-amber-400 p-6 rounded-full mb-6 shadow-2xl">
                    <Ionicons name="trophy" size={60} color="white" />
                </View>

                <Text className="text-white text-5xl font-black mb-2 uppercase italic tracking-tighter text-center">
                    Oyun Bitti!
                </Text>

                <Text className="text-indigo-200 text-lg font-bold mb-12 uppercase tracking-widest text-center px-4">
                    {winnerKey === "Draw" ? "Dostluk Kazandı!" : `${winnerName} KAZANDI!`}
                </Text>

                {/* Skor Tablosu */}
                <View className="w-full bg-white/10 p-8 rounded-[40px] border border-white/20 shadow-xl mb-12">
                    <View className="flex-row justify-around items-center">
                        {/* Takım A */}
                        <View className="items-center flex-1">
                            <Text
                                className="text-indigo-300 font-bold mb-2 uppercase text-xs text-center"
                                numberOfLines={1}
                            >
                                {settings.teamAName}
                            </Text>
                            <Text
                                className={`text-6xl font-black ${winnerKey === "A" ? "text-amber-400" : "text-white"
                                    }`}
                            >
                                {totalScores.A}
                            </Text>
                        </View>

                        {/* Ayırıcı Çizgi */}
                        <View className="h-16 w-[1px] bg-white/20 mx-2" />

                        {/* Takım B */}
                        <View className="items-center flex-1">
                            <Text
                                className="text-indigo-300 font-bold mb-2 uppercase text-xs text-center"
                                numberOfLines={1}
                            >
                                {settings.teamBName}
                            </Text>
                            <Text
                                className={`text-6xl font-black ${winnerKey === "B" ? "text-amber-400" : "text-white"
                                    }`}
                            >
                                {totalScores.B}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Butonlar */}
                <View className="w-full space-y-4">
                    <TouchableOpacity
                        className="bg-amber-400 w-full py-6 rounded-3xl shadow-2xl active:scale-95"
                        onPress={handleNewGame}
                    >
                        <Text className="text-indigo-900 text-center text-2xl font-black uppercase italic">
                            YENİ OYUN
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="w-full py-4 rounded-3xl border border-white/30"
                        onPress={() => navigation.navigate("Home")}
                    >
                        <Text className="text-white text-center text-lg font-bold uppercase tracking-widest">
                            ANA MENÜYE DÖN
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
