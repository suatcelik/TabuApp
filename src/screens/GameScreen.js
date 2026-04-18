import React, { useEffect, useReducer, useRef, useState, useCallback } from "react";
import {
  View, Text, ActivityIndicator, Modal, StatusBar,
  InteractionManager, BackHandler, Pressable
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";

import { loadAd, subscribeAdEvent, showAd, AdEventType } from '../services/adService';
import { loadWordsOfflineFirst, clearWordsCache } from "../services/wordService";
import { gameReducer, initialState } from "../reducers/gameReducer";
import { saveScore } from "../services/leaderboardService";
import { logRoundEnd } from "../services/analyticsService";
import useGameStore from "../store/useGameStore";
import { getProducts, buyProduct } from "../services/iapService";
import CustomAlert from "../components/CustomAlert";
import AppButton from "../components/AppButton";
import CircularTimer from "../components/CircularTimer";
import AnimatedScore from "../components/AnimatedScore";
import WordCard from "../components/WordCard";
import {
  hapticSuccess, hapticError, hapticLight, hapticMedium, hapticSelection,
} from "../utils/haptics";

const LAST_FIRST_WORD_KEY = "LAST_FIRST_WORD_V1";
const CARD_COLORS = ["bg-fuchsia-700", "bg-amber-400", "bg-sky-500", "bg-red-600"];
const AD_COUNT_KEY = "AD_SHOWN_COUNT_V1";
const UPSELL_EVERY = 3;

const shuffleWords = (words) => {
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const ensureDifferentFirstWord = async (words) => {
  try {
    const lastFirst = await AsyncStorage.getItem(LAST_FIRST_WORD_KEY);
    if (!lastFirst || words.length <= 1) return words;

    if (words[0]?.targetWord === lastFirst) {
      const idx = words.findIndex((w) => w?.targetWord && w.targetWord !== lastFirst);
      if (idx > 0) {
        const newWords = [...words];
        const tmp = newWords[0];
        newWords[0] = newWords[idx];
        newWords[idx] = tmp;
        return newWords;
      }
    }
    return words;
  } catch (_) {
    return words;
  }
};

export default function GameScreen({ navigation }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [fetchError, setFetchError] = useState(null);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);

  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPrice, setUpsellPrice] = useState(null);
  const [isBuying, setIsBuying] = useState(false);

  const [isPaused, setIsPaused] = useState(false);

  const settings = useGameStore((s) => s.settings);
  const setFinalScores = useGameStore((s) => s.setFinalScores);
  const isPremium = useGameStore((s) => s.isPremium);

  const successPlayer = useAudioPlayer(require("../../assets/success.mp3"));
  const errorPlayer = useAudioPlayer(require("../../assets/error.mp3"));
  const tickSlowPlayer = useAudioPlayer(require("../../assets/tick_slow.mp3"));

  const intervalRef = useRef(null);
  const hasPlayedTickRef = useRef(false);
  const pendingUpsellRef = useRef(false);
  const pendingStartAfterPurchaseRef = useRef(false);

  const wordCardRef = useRef(null);

  // Entrance animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(-20);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslate = useSharedValue(30);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 380 });
    headerTranslate.value = withSpring(0, { damping: 14, stiffness: 160 });
    buttonsOpacity.value = withDelay(160, withTiming(1, { duration: 380 }));
    buttonsTranslate.value = withDelay(160, withSpring(0, { damping: 14, stiffness: 160 }));
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslate.value }],
  }));

  useEffect(() => {
    if (isPremium && pendingStartAfterPurchaseRef.current) {
      pendingStartAfterPurchaseRef.current = false;
      hasPlayedTickRef.current = false;
      dispatch({ type: "START_TURN" });
    }
  }, [isPremium]);

  useEffect(() => {
    getProducts().then((products) => {
      const p = products.find((x) => x.productId === "tabu_reklamsiz_v1");
      if (p) setUpsellPrice(p.localizedPrice ?? p.price ?? null);
    }).catch(() => { });
  }, []);

  const incrementAdCount = async () => {
    try {
      const raw = await AsyncStorage.getItem(AD_COUNT_KEY);
      const count = raw ? parseInt(raw, 10) + 1 : 1;
      await AsyncStorage.setItem(AD_COUNT_KEY, String(count));
      if (count % UPSELL_EVERY === 0) {
        pendingUpsellRef.current = true;
      }
    } catch (_) { }
  };

  useEffect(() => {
    const unsubscribeLoaded = subscribeAdEvent(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });

    const unsubscribeClosed = subscribeAdEvent(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      loadAd(isPremium);
      setIsProcessingTurn(false);

      if (pendingUpsellRef.current) {
        pendingUpsellRef.current = false;
        setShowUpsell(true);
        return;
      }
      hasPlayedTickRef.current = false;
      dispatch({ type: "START_TURN" });
    });

    const unsubscribeError = subscribeAdEvent(AdEventType.ERROR, () => {
      setAdLoaded(false);
      setIsProcessingTurn(false);
      loadAd(isPremium);
      hasPlayedTickRef.current = false;
      dispatch({ type: "START_TURN" });
    });

    loadAd(isPremium);

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [isPremium]);

  const handleUpsellClose = () => {
    setShowUpsell(false);
    hasPlayedTickRef.current = false;
    dispatch({ type: "START_TURN" });
  };

  const handleBuyRemoveAds = async () => {
    try {
      setIsBuying(true);
      await buyProduct("tabu_reklamsiz_v1");
      setShowUpsell(false);
      pendingStartAfterPurchaseRef.current = true;
    } catch (e) {
      setShowUpsell(false);
      hasPlayedTickRef.current = false;
      dispatch({ type: "START_TURN" });
      if (e?.message) {
        setAlertConfig({ title: "Hata", message: e.message });
      }
    } finally {
      setIsBuying(false);
    }
  };

  const playSound = (type) => {
    try {
      if (type === "SUCCESS") {
        successPlayer.seekTo?.(0);
        successPlayer.play();
      } else {
        errorPlayer.seekTo?.(0);
        errorPlayer.play();
      }
    } catch (_) { }
  };

  const playTickSlow = () => {
    try {
      tickSlowPlayer.seekTo?.(0);
      tickSlowPlayer.play();
    } catch (_) { }
  };

  const stopTickSlow = () => {
    try {
      if (tickSlowPlayer.playing) tickSlowPlayer.pause();
    } catch (_) { }
  };

  const initGame = useCallback(async () => {
    try {
      setFetchError(null);
      const { words } = await loadWordsOfflineFirst();
      const list = Array.isArray(words) ? words : [];
      let shuffled = shuffleWords(list);
      shuffled = await ensureDifferentFirstWord(shuffled);
      dispatch({ type: "SET_WORDS", payload: shuffled });
      if (shuffled.length > 0) {
        AsyncStorage.setItem(LAST_FIRST_WORD_KEY, shuffled[0]?.targetWord || "").catch(() => { });
      }
    } catch (e) {
      setFetchError("Bağlantı hatası veya kelimeler yüklenemedi.");
      dispatch({ type: "SET_WORDS", payload: [] });
    }
  }, []);

  useEffect(() => {
    initGame();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [initGame]);

  useEffect(() => {
    if (!settings) return;
    dispatch({
      type: "INIT_SETTINGS",
      payload: {
        duration: settings.duration,
        maxPass: settings.maxPass,
        roundsPerTeam: settings.roundsPerTeam,
      },
    });
  }, [settings]);

  useEffect(() => {
    const onBackPress = () => {
      if (!state.isGameOver) {
        hapticMedium();
        setIsPaused(true);
        stopTickSlow();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [state.isGameOver]);

  useEffect(() => {
    if (!state.isActive || isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [state.isActive, isPaused]);

  useEffect(() => {
    if (!state.isActive || state.timeLeft <= 0 || isPaused) {
      hasPlayedTickRef.current = false;
      return;
    }
    if (state.timeLeft <= 8 && !hasPlayedTickRef.current) {
      hasPlayedTickRef.current = true;
      playTickSlow();
    }
    if (state.timeLeft === 8 || state.timeLeft === 5 || state.timeLeft === 3) {
      hapticSelection();
    }
  }, [state.isActive, state.timeLeft, isPaused]);

  useEffect(() => {
    if (state.timeLeft === 0 && state.isActive === false && !state.isGameOver) {
      hapticMedium();
      const teamScore = state.activeTeam === "A" ? state.teamAScore : state.teamBScore;
      logRoundEnd(state.activeTeam, teamScore);
      dispatch({
        type: "NEXT_ROUND",
        payload: {
          duration: settings?.duration,
          maxPass: settings?.maxPass,
          roundsPerTeam: settings?.roundsPerTeam,
        },
      });
    }
  }, [state.timeLeft, state.isActive, state.isGameOver, state.activeTeam, settings]);

  useEffect(() => {
    if (!state.isGameOver) return;
    let cancelled = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    const navTimer = setTimeout(() => {
      if (cancelled) return;
      navigation?.replace?.("Result");
    }, 420);

    InteractionManager.runAfterInteractions(async () => {
      if (cancelled) return;
      try {
        const winnerScore = state.teamAScore > state.teamBScore ? state.teamAScore : state.teamBScore;
        saveScore("Player", winnerScore).catch(() => { });
        setFinalScores({ A: state.teamAScore, B: state.teamBScore });
      } catch (_) { }
    });

    return () => {
      cancelled = true;
      clearTimeout(navTimer);
    };
  }, [state.isGameOver, state.teamAScore, state.teamBScore, navigation, setFinalScores]);

  const onCorrect = () => {
    if (!state.isActive || isPaused) return;
    wordCardRef.current?.success?.();
    hapticSuccess();
    dispatch({ type: "SUCCESS" });
    playSound("SUCCESS");
  };

  const onTaboo = () => {
    if (!state.isActive || isPaused) return;
    wordCardRef.current?.taboo?.();
    hapticError();
    dispatch({ type: "TABOO" });
    playSound("ERROR");
  };

  const onPass = () => {
    if (!state.isActive || isPaused) return;
    wordCardRef.current?.pass?.();
    hapticLight();
    dispatch({ type: "PASS" });
  };

  const startNextTurn = async () => {
    if (isProcessingTurn) return;
    setIsProcessingTurn(true);
    hapticMedium();

    const isFullRoundFinished = state.activeTeam === "A";
    const finishedRound = state.roundNumber - 1;

    if (!isPremium && adLoaded && isFullRoundFinished && finishedRound % 2 === 0 && finishedRound > 0) {
      await incrementAdCount();
      showAd();
      return;
    }

    hasPlayedTickRef.current = false;
    dispatch({ type: "START_TURN" });
    setIsProcessingTurn(false);
  };

  if (state.loading && !state.words?.length && !fetchError) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#a21caf" />
        <Text className="text-slate-500 mt-4 font-bold uppercase tracking-widest text-xs">
          Kelimeler Hazırlanıyor...
        </Text>
      </View>
    );
  }

  const currentWord = state.words?.[state.currentIndex];
  const activeTeamName = state.activeTeam === "A" ? settings?.teamAName : settings?.teamBName;
  const prevTeam = state.activeTeam === "A" ? "B" : "A";
  const prevTeamName = prevTeam === "A" ? settings?.teamAName : settings?.teamBName;
  const prevTeamScore = prevTeam === "A" ? state.teamAScore : state.teamBScore;

  const totalRounds = state.roundsPerTeam ?? settings?.roundsPerTeam ?? 4;
  const roundLabel = `${state.roundNumber ?? 1}/${totalRounds}`;

  const renderThemeBackground = () => {
    const theme = settings?.selectedTheme || "default";
    const IconPattern = ({ color, opacity = 0.1 }) => (
      <View className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden" style={{ opacity }} pointerEvents="none">
        <Ionicons name="ban" size={120} color={color} style={{ position: "absolute", top: -20, left: -20, transform: [{ rotate: "-15deg" }] }} />
        <Ionicons name="chatbubbles" size={100} color={color} style={{ position: "absolute", top: 40, right: -10, transform: [{ rotate: "10deg" }] }} />
        <Ionicons name="hourglass" size={140} color={color} style={{ position: "absolute", top: "40%", left: -30, transform: [{ rotate: "25deg" }] }} />
        <Ionicons name="mic" size={110} color={color} style={{ position: "absolute", top: "60%", right: -20, transform: [{ rotate: "-20deg" }] }} />
        <Ionicons name="volume-mute" size={130} color={color} style={{ position: "absolute", bottom: -30, left: "30%", transform: [{ rotate: "5deg" }] }} />
      </View>
    );

    if (theme === "neon_shhh") {
      return (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-slate-900" pointerEvents="none">
          <View className="absolute -top-10 -left-10 w-80 h-80 rounded-full bg-cyan-500/20" />
          <View className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-fuchsia-600/20" />
          <IconPattern color="#22d3ee" opacity={0.15} />
        </View>
      );
    } else if (theme === "retro_buzz") {
      return (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-orange-50" pointerEvents="none">
          <View className="absolute -top-10 -left-10 w-96 h-96 rounded-full bg-amber-200/40" />
          <View className="absolute -bottom-10 -right-10 w-96 h-96 rounded-full bg-orange-300/30" />
          <IconPattern color="#f59e0b" opacity={0.2} />
        </View>
      );
    } else if (theme === "golden_victory") {
      return (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-zinc-900" pointerEvents="none">
          <View className="absolute top-0 left-0 right-0 bottom-0 bg-yellow-900/10" />
          <IconPattern color="#eab308" opacity={0.15} />
        </View>
      );
    } else if (theme === "pixel_guesser") {
      return (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-emerald-50" pointerEvents="none">
          <View className="absolute top-1/4 -left-10 w-64 h-64 rounded-xl bg-emerald-200/50 transform rotate-12" />
          <View className="absolute bottom-1/4 -right-10 w-64 h-64 rounded-xl bg-teal-200/50 transform -rotate-12" />
          <IconPattern color="#10b981" opacity={0.15} />
        </View>
      );
    } else if (theme === "graffiti_shhh") {
      return (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-rose-50" pointerEvents="none">
          <View className="absolute -top-10 -left-10 w-80 h-80 rounded-full bg-rose-200/50" />
          <View className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-pink-200/50" />
          <IconPattern color="#e11d48" opacity={0.15} />
        </View>
      );
    }

    return (
      <View className="absolute top-0 left-0 right-0 bottom-0 bg-slate-50" pointerEvents="none">
        <View className="absolute -top-10 -left-10 w-80 h-80 rounded-full bg-fuchsia-200/40" />
        <View className="absolute top-1/3 -right-16 w-[350px] h-[350px] rounded-full bg-sky-200/30" />
        <View className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-amber-100/40" />
        <IconPattern color="#94a3b8" opacity={0.05} />
      </View>
    );
  };

  const isDarkTheme = settings?.selectedTheme === "neon_shhh" || settings?.selectedTheme === "golden_victory";
  const textColor = isDarkTheme ? "text-slate-100" : "text-slate-800";
  const mutedTextColor = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const currentColor = CARD_COLORS[(state.currentIndex ?? 0) % CARD_COLORS.length];
  const headerTextColor = currentColor === "bg-amber-400" ? "text-slate-900" : "text-white";

  const currentTeamScore = state.activeTeam === "A" ? state.teamAScore : state.teamBScore;

  return (
    <SafeAreaView className={`flex-1 ${isDarkTheme ? "bg-slate-900" : "bg-slate-50"}`}>
      <StatusBar barStyle={isDarkTheme ? "light-content" : "dark-content"} />

      {renderThemeBackground()}

      <Animated.View
        style={headerStyle}
        className={`flex-row justify-between items-center px-4 pt-3 pb-3 z-10 ${isDarkTheme ? "bg-slate-800/80" : "bg-white/80"} shadow-sm`}
      >
        <Pressable
          hitSlop={10}
          accessibilityLabel="Oyunu duraklat"
          accessibilityRole="button"
          onPress={() => {
            hapticLight();
            setIsPaused(true);
            stopTickSlow();
          }}
          className="items-center justify-center active:opacity-70"
          style={{ width: 44, height: 44 }}
        >
          <Ionicons name="pause-circle" size={36} color={isDarkTheme ? "#94a3b8" : "#64748b"} />
        </Pressable>

        <View className="items-center flex-1">
          <Text className={`${mutedTextColor} text-[10px] font-bold uppercase tracking-widest`} numberOfLines={1}>
            {activeTeamName}
          </Text>
          <AnimatedScore value={currentTeamScore} size={30} />
        </View>

        <View className="items-center mx-2">
          <CircularTimer
            timeLeft={state.timeLeft}
            total={settings?.duration ?? 60}
            size={88}
            stroke={8}
            dark={isDarkTheme}
          />
          <Text className={`${mutedTextColor} text-[10px] font-bold uppercase tracking-widest mt-1`}>
            TUR {roundLabel}
          </Text>
        </View>

        <View className="items-center flex-1">
          <Text className={`${mutedTextColor} text-[10px] font-bold uppercase tracking-widest`}>
            Pas ({settings?.maxPass ?? 3})
          </Text>
          <AnimatedScore value={state.passCount} size={30} />
        </View>
      </Animated.View>

      <View className="flex-1 justify-center px-6 z-10">
        <WordCard
          ref={wordCardRef}
          word={currentWord?.targetWord}
          forbiddenWords={currentWord?.forbiddenWords}
          headerBg={currentColor}
          headerTextColor={headerTextColor}
          isDark={isDarkTheme}
          currentIndex={state.currentIndex}
        />
      </View>

      <Animated.View style={buttonsStyle} className="flex-row px-6 pb-8 gap-3 z-10">
        <AppButton
          label="Tabu"
          icon="close-circle"
          variant="danger"
          size="lg"
          haptic={null}
          onPress={onTaboo}
          disabled={!state.isActive || isPaused}
          style={{ flex: 1 }}
        />

        <AppButton
          label="Pas"
          icon="refresh-circle"
          variant={state.passCount <= 0 ? "outline" : "accent"}
          size="lg"
          haptic={null}
          onPress={onPass}
          disabled={!state.isActive || state.passCount <= 0 || isPaused}
          style={{ flex: 1 }}
        />

        <AppButton
          label="Doğru"
          icon="checkmark-circle"
          variant="success"
          size="lg"
          haptic={null}
          onPress={onCorrect}
          disabled={!state.isActive || isPaused}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <Modal visible={!!fetchError} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="bg-white w-full rounded-[32px] p-6 shadow-2xl">
            <View className="items-center mb-4">
              <View className="bg-rose-100 p-4 rounded-full mb-2">
                <Ionicons name="cloud-offline" size={36} color="#e11d48" />
              </View>
              <Text className="text-slate-800 text-xl font-black uppercase tracking-widest">Bağlantı Sorunu</Text>
            </View>
            <Text className="text-slate-500 font-bold text-base mb-6 text-center leading-6">{fetchError}</Text>
            <View className="flex-row gap-3">
              <AppButton
                label="Tekrar Dene"
                icon="refresh"
                variant="primary"
                size="md"
                style={{ flex: 1 }}
                onPress={async () => {
                  try { await clearWordsCache?.(); } catch (_) { }
                  setFetchError(null);
                  initGame();
                }}
              />
              <AppButton
                label="Çıkış"
                variant="outline"
                size="md"
                glow={false}
                style={{ flex: 1 }}
                onPress={() => { setFetchError(null); navigation.navigate("Home"); }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!state.isActive && !state.isGameOver && state.timeLeft > 0 && !fetchError && !isPaused}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-indigo-900/95 items-center justify-center px-6">
          <View className="bg-white w-full p-8 rounded-[40px] items-center shadow-2xl">
            <View className="bg-amber-100 p-4 rounded-full mb-4">
              <Ionicons name="stats-chart" size={40} color="#f59e0b" />
            </View>
            <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Tur Sonucu</Text>
            <Text className="text-fuchsia-700 text-2xl font-black mb-1 text-center" numberOfLines={1}>
              {prevTeamName}
            </Text>
            <Text className="text-6xl font-black text-slate-800 mb-2">{prevTeamScore}</Text>
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
              TUR {roundLabel}
            </Text>

            {/* Mini totals */}
            <View className="w-full flex-row justify-around mb-6">
              <View className="items-center">
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  {settings?.teamAName}
                </Text>
                <Text className="text-slate-800 text-xl font-black">{state.teamAScore}</Text>
              </View>
              <View className="w-[1px] bg-slate-100" />
              <View className="items-center">
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  {settings?.teamBName}
                </Text>
                <Text className="text-slate-800 text-xl font-black">{state.teamBScore}</Text>
              </View>
            </View>

            <Text className="text-slate-500 font-bold mb-6 text-center text-base leading-6">
              Sıra <Text className="text-fuchsia-700 font-black">{activeTeamName}</Text> ekibinde.
            </Text>

            <AppButton
              label={`${activeTeamName} BAŞLASIN`}
              icon="play"
              variant="primary"
              size="xl"
              loading={isProcessingTurn}
              onPress={startNextTurn}
              haptic="medium"
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showUpsell && !isPaused} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="bg-white w-full rounded-[36px] overflow-hidden shadow-2xl">
            <View className="bg-fuchsia-700 pt-8 pb-6 items-center px-6">
              <View className="bg-white/20 p-4 rounded-full mb-3">
                <Ionicons name="ban" size={40} color="white" />
              </View>
              <Text className="text-white text-2xl font-black text-center">
                Reklamlardan Bıktın mı?
              </Text>
              <Text className="text-fuchsia-100 text-sm font-bold text-center mt-1">
                Tek seferlik ödeme, sonsuza kadar reklamsız!
              </Text>
            </View>
            <View className="px-6 pt-6 pb-6">
              <View className="gap-3 mb-6">
                {[
                  { icon: "checkmark-circle", text: "Hiç reklam yok" },
                  { icon: "checkmark-circle", text: "Turlar arasında kesintisiz oyun" },
                  { icon: "checkmark-circle", text: "Tek seferlik satın al, ömür boyu kullan" },
                ].map((item) => (
                  <View key={item.text} className="flex-row items-center gap-3">
                    <Ionicons name={item.icon} size={22} color="#a21caf" />
                    <Text className="text-slate-700 font-bold text-base">{item.text}</Text>
                  </View>
                ))}
              </View>
              <AppButton
                label={`Reklamları Kaldır${upsellPrice ? ` — ${upsellPrice}` : ""}`}
                variant="primary"
                size="lg"
                loading={isBuying}
                haptic="medium"
                onPress={handleBuyRemoveAds}
                style={{ marginBottom: 10 }}
              />
              <Pressable
                hitSlop={6}
                className="w-full py-4 items-center active:opacity-60"
                onPress={handleUpsellClose}
                disabled={isBuying}
                accessibilityRole="button"
                accessibilityLabel="Hayır, devam et"
              >
                <Text className="text-slate-400 font-bold text-sm">Hayır, devam et</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isPaused} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70 px-6 z-50">
          <View className="bg-white w-full rounded-[36px] p-8 items-center shadow-2xl">
            <View className="bg-amber-100 p-4 rounded-full mb-3">
              <Ionicons name="pause-circle" size={44} color="#f59e0b" />
            </View>
            <Text className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-widest">
              Oyun Duraklatıldı
            </Text>

            <AppButton
              label="Oyuna Dön"
              icon="play"
              variant="info"
              size="lg"
              haptic="medium"
              onPress={() => {
                setIsPaused(false);
                if (state.timeLeft <= 8 && state.timeLeft > 0) playTickSlow();
              }}
              style={{ marginBottom: 12 }}
            />

            <AppButton
              label="Çıkış Yap"
              icon="exit"
              variant="danger"
              size="lg"
              haptic="medium"
              onPress={() => {
                setIsPaused(false);
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                stopTickSlow();
                if (navigation.canGoBack()) navigation.popToTop();
                else navigation.replace("Home");
              }}
            />
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={!!alertConfig}
        {...alertConfig}
        onClose={() => setAlertConfig(null)}
      />
    </SafeAreaView>
  );
}
