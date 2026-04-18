import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StatusBar,
  Share,
  useWindowDimensions,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";

import useGameStore from "../store/useGameStore";
import { loadAd, subscribeAdEvent, showAd, AdEventType } from "../services/adService";
import AppButton from "../components/AppButton";
import GradientBackground from "../components/GradientBackground";
import PulsingRings from "../components/PulsingRings";
import OrbitingSparkles from "../components/OrbitingSparkles";
import ScorePodium from "../components/ScorePodium";
import { hapticSuccess, hapticLight, hapticSelection, hapticMedium } from "../utils/haptics";

export default function ResultScreen({ navigation }) {
  const finalScores = useGameStore((s) => s.finalScores);
  const settings = useGameStore((s) => s.settings);
  const resetGame = useGameStore((s) => s.resetGame);
  const isPremium = useGameStore((s) => s.isPremium);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [showConfetti, setShowConfetti] = useState(false);
  const [secondaryBurst, setSecondaryBurst] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

  const winPlayer = useAudioPlayer(require("../../assets/success.mp3"));
  const confettiRef = useRef(null);

  const scoreA = Number(finalScores?.A ?? 0);
  const scoreB = Number(finalScores?.B ?? 0);
  const winnerKey = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "Draw";

  const winnerName =
    winnerKey === "A"
      ? settings?.teamAName
      : winnerKey === "B"
        ? settings?.teamBName
        : "Berabere";

  const isDraw = winnerKey === "Draw";

  // Shared values for hero sequence
  const badgeScale = useSharedValue(0);
  const badgeRotate = useSharedValue(-20);
  const badgeGlow = useSharedValue(0);

  const trophyScale = useSharedValue(0);
  const trophyRotate = useSharedValue(-30);
  const trophyFloat = useSharedValue(0);

  const eyebrowOpacity = useSharedValue(0);
  const eyebrowTranslate = useSharedValue(-14);

  const titleScale = useSharedValue(0.6);
  const titleOpacity = useSharedValue(0);

  const winnerNameOpacity = useSharedValue(0);
  const winnerNameTranslate = useSharedValue(24);

  const podiumOpacity = useSharedValue(0);
  const podiumTranslate = useSharedValue(40);

  const actionsOpacity = useSharedValue(0);
  const actionsTranslate = useSharedValue(40);

  useEffect(() => {
    // Hero sequence
    badgeScale.value = withSpring(1, { damping: 10, stiffness: 180, mass: 0.9 });
    badgeRotate.value = withSpring(0, { damping: 10, stiffness: 160 });
    badgeGlow.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );

    trophyScale.value = withDelay(
      150,
      withSpring(1, { damping: 9, stiffness: 160, mass: 0.9 })
    );
    trophyRotate.value = withDelay(
      150,
      withSpring(0, { damping: 10, stiffness: 160 })
    );
    trophyFloat.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(8, { duration: 1500, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );

    eyebrowOpacity.value = withDelay(280, withTiming(1, { duration: 320 }));
    eyebrowTranslate.value = withDelay(280, withSpring(0, { damping: 14, stiffness: 160 }));

    titleOpacity.value = withDelay(380, withTiming(1, { duration: 420 }));
    titleScale.value = withDelay(380, withSpring(1, { damping: 10, stiffness: 180 }));

    winnerNameOpacity.value = withDelay(560, withTiming(1, { duration: 420 }));
    winnerNameTranslate.value = withDelay(
      560,
      withSpring(0, { damping: 14, stiffness: 160 })
    );

    podiumOpacity.value = withDelay(780, withTiming(1, { duration: 420 }));
    podiumTranslate.value = withDelay(780, withSpring(0, { damping: 14, stiffness: 160 }));

    actionsOpacity.value = withDelay(1100, withTiming(1, { duration: 420 }));
    actionsTranslate.value = withDelay(
      1100,
      withSpring(0, { damping: 14, stiffness: 160 })
    );
  }, []);

  // Haptic cadence matching the hero entrance (only once)
  useEffect(() => {
    const t1 = setTimeout(() => hapticMedium(), 150);
    const t2 = setTimeout(() => hapticLight(), 560);
    const t3 = setTimeout(() => {
      if (!isDraw) hapticSuccess();
    }, 1050);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isDraw]);

  // Animated styles
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { rotateZ: `${badgeRotate.value}deg` },
    ],
  }));

  const badgeGlowStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + badgeGlow.value * 0.6,
    transform: [{ scale: 1 + badgeGlow.value * 0.1 }],
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotateZ: `${trophyRotate.value}deg` },
      { translateY: trophyFloat.value },
    ],
  }));

  const eyebrowStyle = useAnimatedStyle(() => ({
    opacity: eyebrowOpacity.value,
    transform: [{ translateY: eyebrowTranslate.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));

  const winnerNameStyle = useAnimatedStyle(() => ({
    opacity: winnerNameOpacity.value,
    transform: [{ translateY: winnerNameTranslate.value }],
  }));

  const podiumStyle = useAnimatedStyle(() => ({
    opacity: podiumOpacity.value,
    transform: [{ translateY: podiumTranslate.value }],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    transform: [{ translateY: actionsTranslate.value }],
  }));

  // Confetti + ad listeners
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

    if (!isDraw) {
      const t1 = setTimeout(() => {
        setShowConfetti(true);
        try { winPlayer.seekTo?.(0); winPlayer.play(); } catch (_) { }
      }, 650);

      const t2 = setTimeout(() => {
        setSecondaryBurst(true);
      }, 1800);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
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
  }, [isPremium, isDraw]);

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
      const msg = isDraw
        ? `Tabu GO: ${settings?.teamAName} ${scoreA} - ${scoreB} ${settings?.teamBName} berabere bitti!`
        : `Tabu GO: ${winnerName} ${Math.max(scoreA, scoreB)} puanla kazandı!`;
      await Share.share({ message: `${msg}\n\nSen de arkadaşlarınla oyna!` });
    } catch (_) { }
  };

  const handleHome = () => {
    hapticSelection();
    resetGame();
    navigation.navigate("Home");
  };

  const variant = isDraw ? "defeat" : "victory";
  const glowColor = isDraw ? "#818cf8" : "#fde68a";
  const badgeBg = isDraw ? "bg-slate-700" : "bg-amber-400";
  const trophyIcon = isDraw ? "people-circle" : "trophy";
  const resultTitle = isDraw ? "BERABERE" : "ZAFER!";
  const eyebrowText = isDraw ? "İki takım da eşit!" : "Kazanan Takım";

  return (
    <View style={{ flex: 1, backgroundColor: "#0b0324" }}>
      <GradientBackground variant={variant} />

      <StatusBar barStyle="light-content" />

      {showConfetti && !isDraw && (
        <ConfettiCannon
          ref={confettiRef}
          count={160}
          origin={{ x: -10, y: 0 }}
          fadeOut
          fallSpeed={2800}
          explosionSpeed={420}
        />
      )}
      {secondaryBurst && !isDraw && (
        <ConfettiCannon
          count={90}
          origin={{ x: width + 10, y: 80 }}
          fadeOut
          fallSpeed={3200}
          explosionSpeed={520}
        />
      )}

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 12,
            justifyContent: "space-between",
          }}
        >
          {/* HERO */}
          <View style={{ alignItems: "center", paddingTop: 8 }}>
            <Animated.View style={eyebrowStyle}>
              <Text
                allowFontScaling={false}
                style={{
                  color: "#f0abfc",
                  textAlign: "center",
                  fontWeight: "900",
                  fontSize: 12,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Oyun Bitti
              </Text>
            </Animated.View>

            <Animated.View style={titleStyle}>
              <Text
                allowFontScaling={false}
                style={{
                  color: "white",
                  textAlign: "center",
                  fontWeight: "900",
                  fontSize: 56,
                  letterSpacing: -2,
                  fontStyle: "italic",
                  textShadowColor: "rgba(0,0,0,0.35)",
                  textShadowOffset: { width: 0, height: 4 },
                  textShadowRadius: 10,
                }}
              >
                {resultTitle}
              </Text>
            </Animated.View>

            <View
              style={{
                width: 180,
                height: 180,
                marginTop: 18,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PulsingRings size={170} color={glowColor} />

              {!isDraw && (
                <OrbitingSparkles
                  radius={92}
                  count={8}
                  duration={18000}
                  icons={["sparkles", "star", "sparkles", "star", "sparkles", "star", "sparkles", "star"]}
                  color="#fde68a"
                  iconSize={18}
                />
              )}

              <Animated.View
                style={[
                  {
                    position: "absolute",
                    width: 170,
                    height: 170,
                    borderRadius: 85,
                    backgroundColor: glowColor,
                  },
                  badgeGlowStyle,
                ]}
              />

              <Animated.View
                style={[
                  badgeStyle,
                  {
                    shadowColor: glowColor,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.7,
                    shadowRadius: 24,
                    elevation: 12,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    trophyStyle,
                    {
                      width: 130,
                      height: 130,
                      borderRadius: 65,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                  className={badgeBg}
                >
                  <Ionicons name={trophyIcon} size={74} color="white" />
                </Animated.View>
              </Animated.View>
            </View>

            <Animated.View style={[eyebrowStyle, { marginTop: 18 }]}>
              <Text
                allowFontScaling={false}
                style={{
                  color: "rgba(255,255,255,0.7)",
                  textAlign: "center",
                  fontWeight: "800",
                  fontSize: 11,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                {eyebrowText}
              </Text>
            </Animated.View>

            <Animated.View style={winnerNameStyle}>
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={{
                  color: "#ffffff",
                  textAlign: "center",
                  fontWeight: "900",
                  fontSize: 32,
                  letterSpacing: -0.5,
                  marginTop: 4,
                  textShadowColor: "rgba(0,0,0,0.3)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 6,
                }}
              >
                {isDraw ? "Dostluk Kazandı" : winnerName}
              </Text>
            </Animated.View>
          </View>

          {/* PODIUM */}
          <Animated.View
            style={[
              podiumStyle,
              {
                backgroundColor: "rgba(15, 23, 42, 0.35)",
                borderRadius: 32,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                paddingVertical: 20,
                paddingHorizontal: 12,
                marginVertical: 12,
              },
            ]}
          >
            <ScorePodium
              teamAName={settings?.teamAName}
              teamBName={settings?.teamBName}
              scoreA={scoreA}
              scoreB={scoreB}
              winnerKey={winnerKey}
              startDelay={780}
            />
          </Animated.View>

          {/* ACTIONS */}
          <Animated.View style={actionsStyle}>
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

            <View style={{ flexDirection: "row", gap: 12 }}>
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
                variant="ghost"
                size="md"
                glow={false}
                onPress={handleHome}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
