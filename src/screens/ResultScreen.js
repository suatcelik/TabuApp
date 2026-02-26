import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import useGameStore from "../store/useGameStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";

// Güncellenmiş servis fonksiyonları
import {
  checkAndShowAd,
  prepareNextGameAd,
} from "../services/adService";

export default function ResultScreen({ navigation }) {
  const finalScores = useGameStore((s) => s.finalScores);
  const settings = useGameStore((s) => s.settings);
  const resetGame = useGameStore((s) => s.resetGame);

  const [showConfetti, setShowConfetti] = useState(false);
  // Butona basıldığında çift tıklamayı ve UI donmasını önlemek için loading state
  const [isProcessing, setIsProcessing] = useState(false);

  const winPlayer = useAudioPlayer(require("../../assets/success.mp3"));

  const scoreA = Number(finalScores?.A ?? 0);
  const scoreB = Number(finalScores?.B ?? 0);
  const winnerKey = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "Draw";

  const winnerName =
    winnerKey === "A"
      ? settings?.teamAName
      : winnerKey === "B"
        ? settings?.teamBName
        : "Berabere";

  // 1) Ekran Yüklenince: Reklam servisine "Hazırlan" komutu ver
  useEffect(() => {
    prepareNextGameAd();

    // Konfeti ve Ses
    if (winnerKey !== "Draw") {
      const timer = setTimeout(() => {
        setShowConfetti(true);
        try { winPlayer.seekTo?.(0); winPlayer.play(); } catch (_) { }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNewGame = async () => {
    if (isProcessing) return; // Çift tıklamayı önle
    setIsProcessing(true);

    // Navigasyon Fonksiyonu (Reklam kapanınca veya reklam yoksa çalışır)
    const navigateHome = () => {
      resetGame();
      setIsProcessing(false);
      navigation.navigate("Home");
    };

    try {
      // 2) Reklam Kontrolü: Navigasyonu callback olarak gönderiyoruz.
      // Eğer reklam gösterilirse 'didShow' true döner, navigasyon reklam kapanınca çalışır.
      // Eğer reklam gösterilmezse 'didShow' false döner, biz hemen çalıştırırız.
      const didShow = await checkAndShowAd(navigateHome);

      if (!didShow) {
        navigateHome();
      }
      // didShow === true ise, adService içindeki 'onAdClosed' navigasyonu tetikleyecek.

    } catch (error) {
      // Herhangi bir hata durumunda kullanıcıyı bekletme
      console.log("Oyun geçiş hatası:", error);
      navigateHome();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-fuchsia-700">
      <StatusBar barStyle="light-content" />

      {showConfetti && (
        <ConfettiCannon
          count={120}
          origin={{ x: -10, y: 0 }}
          fadeOut={true}
          fallSpeed={2800}
        />
      )}

      <View className="flex-1 items-center justify-center px-6">
        {/* Kupa ve Başlık Alanı */}
        <View className="bg-amber-400 p-8 rounded-full mb-6 shadow-2xl">
          <Ionicons name="trophy" size={60} color="white" />
        </View>

        <Text className="text-white text-5xl font-black mb-6 uppercase italic tracking-tighter text-center">
          Oyun Bitti!
        </Text>

        <Text className="text-white text-3xl font-bold mb-12 uppercase tracking-widest text-center">
          {winnerKey === "Draw" ? "Dostluk Kazandı!" : `${winnerName} KAZANDI!`}
        </Text>

        {/* Skor Tablosu */}
        <View className="w-full bg-white/10 p-8 rounded-[40px] border border-white/20 shadow-xl mb-12">
          <View className="flex-row justify-around items-center">
            <View className="items-center flex-1">
              <Text className="text-white font-bold mb-2 uppercase text-base text-center">
                {settings?.teamAName}
              </Text>
              <Text className={`text-6xl font-black ${winnerKey === "A" ? "text-amber-400" : "text-white"}`}>
                {scoreA}
              </Text>
            </View>
            <View className="h-16 w-[1px] bg-white/20 mx-2" />
            <View className="items-center flex-1">
              <Text className="text-white font-bold mb-2 uppercase text-base text-center">
                {settings?.teamBName}
              </Text>
              <Text className={`text-6xl font-black ${winnerKey === "B" ? "text-amber-400" : "text-white"}`}>
                {scoreB}
              </Text>
            </View>
          </View>
        </View>

        {/* Buton Alanı */}
        <View className="w-full">
          <TouchableOpacity
            className={`bg-amber-400 w-full py-6 rounded-3xl shadow-2xl ${isProcessing ? 'opacity-80' : 'active:scale-95'}`}
            onPress={handleNewGame}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white text-center text-2xl font-black uppercase italic">
                YENİ OYUN
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}