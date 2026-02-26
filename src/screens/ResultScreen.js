// src/screens/ResultScreen.js

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StatusBar, ActivityIndicator } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import useGameStore from "../store/useGameStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import { checkAndShowAd, prepareNextGameAd } from "../services/adService";

export default function ResultScreen({ navigation }) {
  const finalScores = useGameStore((s) => s.finalScores);
  const settings = useGameStore((s) => s.settings);
  const resetGame = useGameStore((s) => s.resetGame);
  const isPremium = useGameStore((s) => s.isPremium);

  const [showConfetti, setShowConfetti] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const winPlayer = useAudioPlayer(require("../../assets/success.mp3"));

  const scoreA = Number(finalScores?.A ?? 0);
  const scoreB = Number(finalScores?.B ?? 0);
  const winnerKey = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "Draw";
  const winnerName = winnerKey === "A" ? settings?.teamAName : winnerKey === "B" ? settings?.teamBName : "Berabere";

  useEffect(() => {
    prepareNextGameAd(); // Reklamı önceden yükle
    if (winnerKey !== "Draw") {
      setTimeout(() => {
        setShowConfetti(true);
        try { winPlayer.play(); } catch (_) { }
      }, 500);
    }
  }, []);

  const handleNewGame = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const navigateHome = () => {
      resetGame();
      setIsProcessing(false);
      navigation.navigate("Home");
    };

    // Premium ise reklamsız geç, değilse reklam göster
    if (isPremium) {
      navigateHome();
    } else {
      try {
        const didShow = await checkAndShowAd(navigateHome);
        if (!didShow) navigateHome();
      } catch (error) {
        navigateHome();
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-fuchsia-700">
      <StatusBar barStyle="light-content" />
      {showConfetti && <ConfettiCannon count={120} origin={{ x: -10, y: 0 }} fadeOut={true} />}

      <View className="flex-1 items-center justify-center px-6">
        <View className="bg-amber-400 p-8 rounded-full mb-6 shadow-2xl">
          <Ionicons name="trophy" size={60} color="white" />
        </View>

        <Text className="text-white text-5xl font-black mb-6 uppercase italic text-center">Oyun Bitti!</Text>
        <Text className="text-white text-2xl font-bold mb-12 text-center">
          {winnerKey === "Draw" ? "Dostluk Kazandı!" : `${winnerName} KAZANDI!`}
        </Text>

        <View className="w-full bg-white/10 p-8 rounded-[40px] border border-white/20 mb-12">
          <View className="flex-row justify-around items-center">
            <View className="items-center flex-1">
              <Text className="text-white font-bold mb-2 uppercase text-xs">{settings?.teamAName}</Text>
              <Text className="text-white text-5xl font-black">{scoreA}</Text>
            </View>
            <View className="h-12 w-[1px] bg-white/20" />
            <View className="items-center flex-1">
              <Text className="text-white font-bold mb-2 uppercase text-xs">{settings?.teamBName}</Text>
              <Text className="text-white text-5xl font-black">{scoreB}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          className="bg-amber-400 w-full py-6 rounded-3xl shadow-2xl active:scale-95 items-center"
          onPress={handleNewGame}
          disabled={isProcessing}
        >
          {isProcessing ? <ActivityIndicator color="white" /> : <Text className="text-white text-2xl font-black uppercase">YENİ OYUN</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}