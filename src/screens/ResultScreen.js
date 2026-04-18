import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StatusBar,
  Share,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";

import useGameStore from "../store/useGameStore";
import { loadAd, subscribeAdEvent, showAd, AdEventType } from "../services/adService";
import AppButton from "../components/AppButton";
import FloatingBackground from "../components/FloatingBackground";
import { hapticSuccess, hapticLight, hapticSelection } from "../utils/haptics";

export default function ResultScreen({ navigation }) {
  const finalScores = useGameStore((s) => s.finalScores);
  const settings = useGameStore((s) => s.settings);
  const resetGame = useGameStore((s) => s.resetGame);
  const isPremium = useGameStore((s) => s.isPremium);

  const [showConfetti, setShowConfetti] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

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

  // Animations
  const trophyScale = useSharedValue(0);
  const trophyRotate = useSharedValue(-20);
  const trophyFloat = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-30);
  const subOpacity = useSharedValue(0);
  const subTranslate = useSharedValue(30);
  const scoreOpacity = useSharedValue(0);
  const scoreTranslate = useSharedValue(40);
  const actionsOpacity = useSharedValue(0);
  const actionsTranslate = useSharedValue(30);

  useEffect(() => {
    trophyScale.value = withSpring(1, { damping: 10, stiffness: 160, mass: 0.9 });
    trophyRotate.value = withSpring(0, { damping: 10, stiffness: 140 });
    trophyFloat.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          withTiming(8, { duration: 1400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );

    titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    titleTranslate.value = withDelay(200, withSpring(0, { damping: 14, stiffness: 160 }));

    subOpacity.value = withDelay(360, withTiming(1, { duration: 400 }));
    subTranslate.value = withDelay(360, withSpring(0, { damping: 14, stiffness: 160 }));

    scoreOpacity.value = withDelay(520, withTiming(1, { duration: 400 }));
    scoreTranslate.value = withDelay(520, withSpring(0, { damping: 14, stiffness: 160 }));

    actionsOpacity.value = withDelay(720, withTiming(1, { duration: 400 }));
    actionsTranslate.value = withDelay(720, withSpring(0, { damping: 14, stiffness: 160 }));
  }, []);

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotateZ: `${trophyRotate.value}deg` },
      { translateY: trophyFloat.value },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
    transform: [{ translateY: subTranslate.value }],
  }));

  const scoreStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
    transform: [{ translateY: scoreTranslate.value }],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    transform: [{ translateY: actionsTranslate.value }],
  }));

  useEffect(() => {
    const unsubscribeLoaded = subscribeAdEvent(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });

    const unsubscribeClosed = subscribeAdEvent(AdEventType.CLOSED, () => {
      resetGame();
      setIsProcessing(false);
      navigation.navigate("Home");
    });

    const unsubscribeError = subscribeAdEvent(AdEventType.ERROR, () => {
      setAdLoaded(false);
      setIsProcessing(false);
      loadAd(isPremium);
      resetGame();
      navigation.navigate("Home");
    });

    loadAd(isPremium);

    if (winnerKey !== "Draw") {
      const timer = setTimeout(() => {
        setShowConfetti(true);
        hapticSuccess();
        try { winPlayer.seekTo?.(0); winPlayer.play(); } catch (_) { }
      }, 500);

      return () => {
        clearTimeout(timer);
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
      };
    }

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [isPremium, winnerKey]);

  const handleNewGame = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (!isPremium && adLoaded) {
      showAd();
    } else {
      resetGame();
      setIsProcessing(false);
      navigation.navigate("Home");
    }
  };

  const handleShare = async () => {
    hapticLight();
    try {
      const msg =
        winnerKey === "Draw"
          ? `Tabu GO: ${settings?.teamAName} ${scoreA} - ${scoreB} ${settings?.teamBName} berabere bitti! 🎉`
          : `Tabu GO: ${winnerName} ${Math.max(scoreA, scoreB)} puanla kazandı! 🏆`;
      await Share.share({ message: `${msg}\n\nSen de arkadaşlarınla oyna!` });
    } catch (_) { }
  };

  const handleHome = () => {
    hapticSelection();
    resetGame();
    navigation.navigate("Home");
  };

  const bgClass = winnerKey === "Draw" ? "bg-slate-800" : "bg-fuchsia-700";

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <StatusBar barStyle="light-content" />

      <FloatingBackground variant={winnerKey === "Draw" ? "dark" : "light"} />

      {showConfetti && (
        <ConfettiCannon count={140} origin={{ x: -10, y: 0 }} fadeOut fallSpeed={2800} />
      )}

      <View className="flex-1 items-center justify-center px-6">
        <Animated.View style={trophyStyle} className="bg-amber-400 p-7 rounded-full mb-6 shadow-2xl">
          <Ionicons
            name={winnerKey === "Draw" ? "people-circle" : "trophy"}
            size={64}
            color="white"
          />
        </Animated.View>

        <Animated.View style={titleStyle}>
          <Text
            className="text-white text-5xl font-black mb-4 uppercase italic tracking-tighter text-center"
            allowFontScaling={false}
          >
            Oyun Bitti!
          </Text>
        </Animated.View>

        <Animated.View style={subStyle}>
          <Text
            className="text-white text-2xl font-black mb-10 uppercase tracking-widest text-center"
            allowFontScaling={false}
            numberOfLines={2}
          >
            {winnerKey === "Draw" ? "Dostluk Kazandı!" : `${winnerName} KAZANDI!`}
          </Text>
        </Animated.View>

        <Animated.View
          style={scoreStyle}
          className="w-full bg-white/10 p-6 rounded-[36px] border border-white/20 shadow-xl mb-10"
        >
          <View className="flex-row justify-around items-center">
            <View className="items-center flex-1">
              <Text
                className="text-white/80 font-bold mb-2 uppercase text-sm text-center tracking-widest"
                numberOfLines={1}
              >
                {settings?.teamAName}
              </Text>
              <Text
                className={`text-6xl font-black ${winnerKey === "A" ? "text-amber-400" : "text-white"}`}
                allowFontScaling={false}
              >
                {scoreA}
              </Text>
            </View>
            <View className="h-20 w-[1px] bg-white/20 mx-2" />
            <View className="items-center flex-1">
              <Text
                className="text-white/80 font-bold mb-2 uppercase text-sm text-center tracking-widest"
                numberOfLines={1}
              >
                {settings?.teamBName}
              </Text>
              <Text
                className={`text-6xl font-black ${winnerKey === "B" ? "text-amber-400" : "text-white"}`}
                allowFontScaling={false}
              >
                {scoreB}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[actionsStyle, { width: "100%" }]}>
          <AppButton
            label="YENİ OYUN"
            icon="play"
            variant="accent"
            size="xl"
            italic
            loading={isProcessing}
            haptic="medium"
            onPress={handleNewGame}
            style={{ marginBottom: 12 }}
          />

          <View className="flex-row gap-3">
            <AppButton
              label="PAYLAŞ"
              icon="share-social"
              variant="info"
              size="md"
              onPress={handleShare}
              style={{ flex: 1 }}
            />
            <AppButton
              label="ANA MENÜ"
              icon="home"
              variant="outline"
              size="md"
              glow={false}
              onPress={handleHome}
              style={{ flex: 1 }}
            />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
