import React, { useEffect, useReducer, useRef, useState, useCallback, useMemo } from "react";
import {
  View, Text, Modal, StatusBar,
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
  withSequence,
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
import GameOverlay from "../components/GameOverlay";
import ThemeBackground from "../components/ThemeBackground";
import LoadingScreen from "../components/LoadingScreen";
import { ConnectionIllustration } from "../components/Illustrations";
import {
  hapticSuccess, hapticError, hapticLight, hapticMedium, hapticSelection,
} from "../utils/haptics";
import useTheme from "../hooks/useTheme";
import useTranslation from "../hooks/useTranslation";

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
  const [swipeHintVisible, setSwipeHintVisible] = useState(false);

  const settings = useGameStore((s) => s.settings);
  const setFinalScores = useGameStore((s) => s.setFinalScores);
  const isPremium = useGameStore((s) => s.isPremium);
  const addLeaderboardEntry = useGameStore((s) => s.addLeaderboardEntry);

  const soundOn = settings?.sound !== false;

  const theme = useTheme();
  const { t } = useTranslation();

  const successPlayer = useAudioPlayer(require("../../assets/success.mp3"));
  const errorPlayer = useAudioPlayer(require("../../assets/error.mp3"));
  const tickSlowPlayer = useAudioPlayer(require("../../assets/tick_slow.mp3"));

  const intervalRef = useRef(null);
  const hasPlayedTickRef = useRef(false);
  const pendingUpsellRef = useRef(false);
  const pendingStartAfterPurchaseRef = useRef(false);
  const leaderboardSavedRef = useRef(false);

  const wordCardRef = useRef(null);

  const headerOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(-20);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslate = useSharedValue(30);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 380 });
    headerTranslate.value = withSpring(0, { damping: 14, stiffness: 160 });
    buttonsOpacity.value = withDelay(160, withTiming(1, { duration: 380 }));
    buttonsTranslate.value = withDelay(160, withSpring(0, { damping: 14, stiffness: 160 }));
  }, []);

  // Swipe hint: show briefly the first time the user enters a game
  useEffect(() => {
    if (state.words?.length > 0 && !swipeHintVisible) {
      setSwipeHintVisible(true);
      hintOpacity.value = withSequence(
        withTiming(1, { duration: 400 }),
        withDelay(2500, withTiming(0, { duration: 500 }))
      );
      const timer = setTimeout(() => setSwipeHintVisible(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [state.words?.length]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslate.value }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
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
        setAlertConfig({ title: t("common.error"), message: e.message });
      }
    } finally {
      setIsBuying(false);
    }
  };

  const playSound = (type) => {
    if (!soundOn) return;
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
    if (!soundOn) return;
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
      leaderboardSavedRef.current = false;
      if (shuffled.length > 0) {
        AsyncStorage.setItem(LAST_FIRST_WORD_KEY, shuffled[0]?.targetWord || "").catch(() => { });
      }
    } catch (e) {
      setFetchError(t("game.connectionFailed"));
      dispatch({ type: "SET_WORDS", payload: [] });
    }
  }, [t]);

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

        if (!leaderboardSavedRef.current) {
          leaderboardSavedRef.current = true;
          const winner =
            state.teamAScore > state.teamBScore ? "A"
              : state.teamBScore > state.teamAScore ? "B" : "Draw";
          addLeaderboardEntry({
            teamAName: settings?.teamAName,
            teamBName: settings?.teamBName,
            scoreA: state.teamAScore,
            scoreB: state.teamBScore,
            winner,
            date: Date.now(),
          });
        }
      } catch (_) { }
    });

    return () => {
      cancelled = true;
      clearTimeout(navTimer);
    };
  }, [state.isGameOver, state.teamAScore, state.teamBScore, navigation, setFinalScores, addLeaderboardEntry, settings]);

  const onCorrect = useCallback(() => {
    if (!state.isActive || isPaused) return;
    wordCardRef.current?.success?.();
    hapticSuccess();
    dispatch({ type: "SUCCESS" });
    playSound("SUCCESS");
  }, [state.isActive, isPaused, soundOn]);

  const onTaboo = useCallback(() => {
    if (!state.isActive || isPaused) return;
    wordCardRef.current?.taboo?.();
    hapticError();
    dispatch({ type: "TABOO" });
    playSound("ERROR");
  }, [state.isActive, isPaused, soundOn]);

  const onPass = useCallback(() => {
    if (!state.isActive || isPaused || state.passCount <= 0) return;
    wordCardRef.current?.pass?.();
    hapticLight();
    dispatch({ type: "PASS" });
  }, [state.isActive, isPaused, state.passCount]);

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
    return <LoadingScreen message={t("game.preparingWords")} />;
  }

  const currentWord = state.words?.[state.currentIndex];
  const activeTeamName = state.activeTeam === "A" ? settings?.teamAName : settings?.teamBName;
  const prevTeam = state.activeTeam === "A" ? "B" : "A";
  const prevTeamName = prevTeam === "A" ? settings?.teamAName : settings?.teamBName;
  const prevTeamScore = prevTeam === "A" ? state.teamAScore : state.teamBScore;

  const totalRounds = state.roundsPerTeam ?? settings?.roundsPerTeam ?? 4;
  const roundLabel = `${state.roundNumber ?? 1}/${totalRounds}`;

  const isDarkTheme = theme.isDark;
  const mutedTextColor = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const currentColor = CARD_COLORS[(state.currentIndex ?? 0) % CARD_COLORS.length];
  const headerTextColor = currentColor === "bg-amber-400" ? "text-slate-900" : "text-white";

  const currentTeamScore = state.activeTeam === "A" ? state.teamAScore : state.teamBScore;

  const difficultyRaw = currentWord?.difficulty;
  const difficultyLabel = difficultyRaw ? t(`game.difficulty.${difficultyRaw}`) : null;

  const passBadgeText = state.passCount > 0 ? `${state.passCount}/${settings?.maxPass ?? 3}` : null;

  return (
    <SafeAreaView className={`flex-1 ${isDarkTheme ? "bg-slate-900" : "bg-slate-50"}`}>
      <StatusBar barStyle={isDarkTheme ? "light-content" : "dark-content"} />

      <ThemeBackground themeId={settings?.selectedTheme || "default"} />

      <Animated.View
        style={headerStyle}
        className={`flex-row justify-between items-center px-4 pt-3 pb-3 z-10 ${isDarkTheme ? "bg-slate-800/80" : "bg-white/80"} shadow-sm`}
      >
        <Pressable
          hitSlop={10}
          accessibilityLabel={t("game.pause")}
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
          <Text className={`${mutedTextColor} text-[11px] font-bold uppercase tracking-widest`} numberOfLines={1}>
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
          <Text className={`${mutedTextColor} text-[11px] font-bold uppercase tracking-widest mt-1`}>
            {t("game.round")} {roundLabel}
          </Text>
        </View>

        <View className="items-center flex-1">
          <Text className={`${mutedTextColor} text-[11px] font-bold uppercase tracking-widest`}>
            {t("game.pass")}
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
          difficulty={difficultyRaw}
          difficultyLabel={difficultyLabel}
          swipeEnabled={!isPaused && state.isActive}
          onSwipeCorrect={onCorrect}
          onSwipeTaboo={onTaboo}
          onSwipePass={onPass}
        />

        {swipeHintVisible ? (
          <Animated.View style={hintStyle} pointerEvents="none" className="items-center mt-4">
            <View className={`${isDarkTheme ? "bg-slate-800" : "bg-white"} px-3 py-1.5 rounded-full border ${isDarkTheme ? "border-slate-700" : "border-slate-200"} flex-row items-center`}>
              <Ionicons name="swap-horizontal" size={12} color={isDarkTheme ? "#cbd5e1" : "#64748b"} />
              <Text className={`ml-1 text-[10px] font-black uppercase tracking-widest ${mutedTextColor}`}>
                {t("game.swipeHint")}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </View>

      <Animated.View style={buttonsStyle} className="flex-row px-6 pb-8 gap-3 z-10">
        <AppButton
          label={t("game.taboo")}
          icon="close-circle"
          variant="danger"
          size="lg"
          haptic={null}
          onPress={onTaboo}
          disabled={!state.isActive || isPaused}
          style={{ flex: 1 }}
          accessibilityLabel={t("game.taboo")}
        />

        <AppButton
          label={t("game.pass")}
          icon="refresh-circle"
          variant={state.passCount <= 0 ? "outline" : "accent"}
          size="lg"
          haptic={null}
          onPress={onPass}
          disabled={!state.isActive || state.passCount <= 0 || isPaused}
          style={{ flex: 1 }}
          badge={passBadgeText}
          accessibilityLabel={`${t("game.pass")} ${passBadgeText || ""}`}
        />

        <AppButton
          label={t("game.correct")}
          icon="checkmark-circle"
          variant="success"
          size="lg"
          haptic={null}
          onPress={onCorrect}
          disabled={!state.isActive || isPaused}
          style={{ flex: 1 }}
          accessibilityLabel={t("game.correct")}
        />
      </Animated.View>

      {/* ERROR OVERLAY */}
      <GameOverlay visible={!!fetchError} onRequestClose={() => setFetchError(null)}>
        <View className="bg-white w-full rounded-[32px] p-6 shadow-2xl">
          <View className="items-center mb-4">
            <ConnectionIllustration size={140} primary="#a21caf" accent="#f59e0b" />
            <Text className="text-slate-800 text-xl font-black uppercase tracking-widest mt-3">
              {t("game.connectionIssue")}
            </Text>
          </View>
          <Text className="text-slate-500 font-bold text-base mb-6 text-center leading-6">
            {fetchError}
          </Text>
          <View className="flex-row gap-3">
            <AppButton
              label={t("common.retry")}
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
              label={t("common.exit")}
              variant="outline"
              size="md"
              glow={false}
              style={{ flex: 1 }}
              onPress={() => { setFetchError(null); navigation.navigate("Home"); }}
            />
          </View>
        </View>
      </GameOverlay>

      {/* ROUND-END OVERLAY */}
      <GameOverlay
        visible={!state.isActive && !state.isGameOver && state.timeLeft > 0 && !fetchError && !isPaused}
        backdropClassName="bg-indigo-950/95"
      >
        <View className="bg-white w-full p-8 rounded-[40px] items-center shadow-2xl">
          <View className="bg-amber-100 p-4 rounded-full mb-4">
            <Ionicons name="stats-chart" size={40} color="#f59e0b" />
          </View>
          <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">
            {t("game.roundResult")}
          </Text>
          <Text className="text-fuchsia-700 text-2xl font-black mb-1 text-center" numberOfLines={1}>
            {prevTeamName}
          </Text>
          <Text className="text-6xl font-black text-slate-800 mb-2">{prevTeamScore}</Text>
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
            {t("game.round")} {roundLabel}
          </Text>

          <View className="w-full flex-row justify-around mb-6">
            <View className="items-center">
              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                {settings?.teamAName}
              </Text>
              <Text className="text-slate-800 text-xl font-black">{state.teamAScore}</Text>
            </View>
            <View className="w-[1px] bg-slate-100" />
            <View className="items-center">
              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                {settings?.teamBName}
              </Text>
              <Text className="text-slate-800 text-xl font-black">{state.teamBScore}</Text>
            </View>
          </View>

          <AppButton
            label={t("game.nextTurnPrompt", { team: (activeTeamName || "").toUpperCase() })}
            icon="play"
            variant="primary"
            size="xl"
            loading={isProcessingTurn}
            onPress={startNextTurn}
            haptic="medium"
          />
        </View>
      </GameOverlay>

      {/* UPSELL OVERLAY */}
      <GameOverlay visible={showUpsell && !isPaused} onRequestClose={handleUpsellClose}>
        <View className="bg-white w-full rounded-[36px] overflow-hidden shadow-2xl">
          <View className="bg-fuchsia-700 pt-8 pb-6 items-center px-6">
            <View className="bg-white/20 p-4 rounded-full mb-3">
              <Ionicons name="ban" size={40} color="white" />
            </View>
            <Text className="text-white text-2xl font-black text-center">
              {t("game.upsellTitle")}
            </Text>
            <Text className="text-fuchsia-100 text-sm font-bold text-center mt-1">
              {t("game.upsellSubtitle")}
            </Text>
          </View>
          <View className="px-6 pt-6 pb-6">
            <View className="gap-3 mb-6">
              {[
                { icon: "checkmark-circle", text: t("game.upsellNoAds") },
                { icon: "checkmark-circle", text: t("game.upsellSeamless") },
                { icon: "checkmark-circle", text: t("game.upsellOneTime") },
              ].map((item) => (
                <View key={item.text} className="flex-row items-center gap-3">
                  <Ionicons name={item.icon} size={22} color="#a21caf" />
                  <Text className="text-slate-700 font-bold text-base">{item.text}</Text>
                </View>
              ))}
            </View>
            <AppButton
              label={`${t("game.removeAds")}${upsellPrice ? ` — ${upsellPrice}` : ""}`}
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
              accessibilityLabel={t("game.noContinue")}
            >
              <Text className="text-slate-400 font-bold text-sm">{t("game.noContinue")}</Text>
            </Pressable>
          </View>
        </View>
      </GameOverlay>

      {/* PAUSE OVERLAY */}
      <GameOverlay visible={isPaused} backdropClassName="bg-black/70" onRequestClose={() => setIsPaused(false)}>
        <View className="bg-white w-full rounded-[36px] p-8 items-center shadow-2xl">
          <View className="bg-amber-100 p-4 rounded-full mb-3">
            <Ionicons name="pause-circle" size={44} color="#f59e0b" />
          </View>
          <Text className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-widest">
            {t("game.pausedTitle")}
          </Text>

          <AppButton
            label={t("game.resume")}
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
            label={t("game.quit")}
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
      </GameOverlay>

      <CustomAlert
        visible={!!alertConfig}
        {...alertConfig}
        onClose={() => setAlertConfig(null)}
      />
    </SafeAreaView>
  );
}
