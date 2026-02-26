import React, { useEffect, useReducer, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
  InteractionManager,
  BackHandler,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";

import { loadWordsOfflineFirst, clearWordsCache } from "../services/wordService";
import { gameReducer, initialState } from "../reducers/gameReducer";
import { saveScore } from "../services/leaderboardService";
import { logRoundEnd } from "../services/analyticsService";
import useGameStore from "../store/useGameStore";

const LAST_FIRST_WORD_KEY = "LAST_FIRST_WORD_V1";
// Varsayılan kart renkleri
const CARD_COLORS = ["bg-fuchsia-700", "bg-amber-400", "bg-sky-500", "bg-red-600"];

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

  const settings = useGameStore((s) => s.settings);
  const setFinalScores = useGameStore((s) => s.setFinalScores);

  const successPlayer = useAudioPlayer(require("../../assets/success.mp3"));
  const errorPlayer = useAudioPlayer(require("../../assets/error.mp3"));
  const tickSlowPlayer = useAudioPlayer(require("../../assets/tick_slow.mp3"));

  const intervalRef = useRef(null);
  const hasPlayedTickRef = useRef(false);

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
      const { words } = await loadWordsOfflineFirst(200);
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
        Alert.alert(
          "Oyundan Çık?",
          "Oyun devam ediyor. Çıkarsanız ilerlemeniz kaybolacak.",
          [
            { text: "İptal", style: "cancel", onPress: () => { } },
            {
              text: "Çık",
              style: "destructive",
              onPress: () => {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                stopTickSlow();
                if (navigation.canGoBack()) {
                  navigation.popToTop();
                } else {
                  navigation.replace("Home");
                }
              },
            },
          ]
        );
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [state.isGameOver, navigation]);

  useEffect(() => {
    if (!state.isActive) {
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
  }, [state.isActive]);

  useEffect(() => {
    if (!state.isActive || state.timeLeft <= 0) {
      hasPlayedTickRef.current = false;
      return;
    }
    if (state.timeLeft <= 8 && !hasPlayedTickRef.current) {
      hasPlayedTickRef.current = true;
      playTickSlow();
    }
  }, [state.isActive, state.timeLeft]);

  useEffect(() => {
    if (state.timeLeft === 0 && state.isActive === false && !state.isGameOver) {
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
    }, 350);

    InteractionManager.runAfterInteractions(async () => {
      if (cancelled) return;
      try {
        const winnerScore =
          state.teamAScore > state.teamBScore ? state.teamAScore : state.teamBScore;
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
    hasPlayedTickRef.current = false;
    dispatch({ type: "START_TURN" });
  };

  if (state.loading && !state.words?.length && !fetchError) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-slate-400 mt-4 font-bold">Kelimeler Hazırlanıyor...</Text>
      </View>
    );
  }

  const currentWord = state.words?.[state.currentIndex];
  const activeTeamName = state.activeTeam === "A" ? settings?.teamAName : settings?.teamBName;
  const prevTeam = state.activeTeam === "A" ? "B" : "A";
  const prevTeamName = prevTeam === "A" ? settings?.teamAName : settings?.teamBName;
  const prevTeamScore = prevTeam === "A" ? state.teamAScore : state.teamBScore;

  const timer = state.timeLeft || 0;
  const mm = Math.floor(timer / 60);
  const ss = timer % 60 < 10 ? `0${timer % 60}` : timer % 60;
  const totalRounds = state.roundsPerTeam ?? settings?.roundsPerTeam ?? 4;
  const roundLabel = `${state.roundNumber ?? 1}/${totalRounds}`;

  // YENİ TEMA RENDER FONKSİYONU
  const renderThemeBackground = () => {
    const theme = settings?.selectedTheme || "default";

    // Ekrana rastgele dağılmış ikonlar (Pattern efekti)
    const IconPattern = ({ color, opacity = 0.1 }) => (
      <View
        className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden"
        style={{ opacity }}
        pointerEvents="none"
      >
        <Ionicons
          name="ban"
          size={120}
          color={color}
          style={{ position: "absolute", top: -20, left: -20, transform: [{ rotate: "-15deg" }] }}
        />
        <Ionicons
          name="chatbubbles"
          size={100}
          color={color}
          style={{ position: "absolute", top: 40, right: -10, transform: [{ rotate: "10deg" }] }}
        />
        <Ionicons
          name="hourglass"
          size={140}
          color={color}
          style={{ position: "absolute", top: "40%", left: -30, transform: [{ rotate: "25deg" }] }}
        />
        <Ionicons
          name="mic"
          size={110}
          color={color}
          style={{ position: "absolute", top: "60%", right: -20, transform: [{ rotate: "-20deg" }] }}
        />
        <Ionicons
          name="volume-mute"
          size={130}
          color={color}
          style={{ position: "absolute", bottom: -30, left: "30%", transform: [{ rotate: "5deg" }] }}
        />
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

    // Default (Klasik Parti)
    return (
      <View className="absolute top-0 left-0 right-0 bottom-0 bg-slate-50" pointerEvents="none">
        <View className="absolute -top-10 -left-10 w-80 h-80 rounded-full bg-fuchsia-200/40" />
        <View className="absolute top-1/3 -right-16 w-[350px] h-[350px] rounded-full bg-sky-200/30" />
        <View className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-amber-100/40" />
        <IconPattern color="#94a3b8" opacity={0.05} />
      </View>
    );
  };

  const isDarkTheme =
    settings?.selectedTheme === "neon_shhh" || settings?.selectedTheme === "golden_victory";
  const textColor = isDarkTheme ? "text-slate-100" : "text-slate-800";
  const mutedTextColor = isDarkTheme ? "text-slate-400" : "text-slate-500";

  const currentColor = CARD_COLORS[(state.currentIndex ?? 0) % CARD_COLORS.length];
  const headerTextColor = currentColor === "bg-amber-400" ? "text-slate-900" : "text-white";

  return (
    <SafeAreaView className={`flex-1 ${isDarkTheme ? "bg-slate-900" : "bg-slate-50"}`}>
      <StatusBar barStyle={isDarkTheme ? "light-content" : "dark-content"} />

      {/* ARKAPLAN TEMA ÇİZİMİ */}
      {renderThemeBackground()}

      {/* Üst Bilgi */}
      <View
        className={`flex-row justify-between items-center px-6 py-4 shadow-sm z-10 ${isDarkTheme ? "bg-slate-800/80" : "bg-white/80"
          }`}
      >
        <View className="items-center flex-1">
          <Text className={`${mutedTextColor} text-[10px] font-bold uppercase`} numberOfLines={1}>
            {activeTeamName}
          </Text>
          <Text className="text-sky-500 text-3xl font-black">
            {state.activeTeam === "A" ? state.teamAScore : state.teamBScore}
          </Text>
        </View>

        <View className="items-center mx-4">
          <View className="flex-row items-center bg-red-500 px-6 py-3 rounded-2xl shadow-lg shadow-indigo-200">
            <Ionicons name="hourglass-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text className="text-white font-black text-xl">
              {mm}:{ss}
            </Text>
          </View>
          <Text className={`${mutedTextColor} text-[10px] font-bold uppercase mt-2`}>
            TUR {roundLabel}
          </Text>
        </View>

        <View className="items-center flex-1">
          <Text className={`${mutedTextColor} text-[10px] font-bold uppercase`}>Pas</Text>
          <Text className="text-amber-400 text-3xl font-black">{state.passCount}</Text>
        </View>
      </View>

      {/* Kart */}
      <View className="flex-1 justify-center px-8 z-10">
        <View
          className={`rounded-[45px] shadow-2xl overflow-hidden border ${isDarkTheme
              ? "bg-slate-800 border-slate-700 shadow-slate-900"
              : "bg-white border-slate-100"
            }`}
        >
          <View className={`${currentColor} py-10 items-center`}>
            <Text
              className={`${headerTextColor} text-4xl font-black uppercase tracking-tighter text-center px-4`}
            >
              {currentWord?.targetWord ?? "—"}
            </Text>
          </View>

          <View className="py-10 items-center">
            {(currentWord?.forbiddenWords ?? []).map((word, index) => (
              <View key={`${word}-${index}`} className="py-2 w-full items-center">
                <Text className={`${textColor} text-2xl font-bold uppercase tracking-tight`}>
                  {word}
                </Text>
                {index < (currentWord?.forbiddenWords?.length ?? 0) - 1 && (
                  <View
                    className={`w-1/2 h-[1px] mt-2 ${isDarkTheme ? "bg-slate-700" : "bg-slate-100"}`}
                  />
                )}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Butonlar - HATA BURADAYDI, KAPANIŞ EKLENDİ */}
      <View className="flex-row px-6 pb-10 gap-4 z-10">
        <TouchableOpacity
          className="flex-1 bg-fuchsia-700 h-24 rounded-3xl items-center justify-center shadow-lg shadow-rose-200 active:scale-95"
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
          className="flex-1 bg-sky-500 h-24 rounded-3xl items-center justify-center shadow-lg shadow-emerald-200 active:scale-95"
          onPress={onCorrect}
          disabled={!state.isActive}
        >
          <Ionicons name="checkmark-circle" size={32} color="white" />
          <Text className="text-white font-black uppercase mt-1">Doğru</Text>
        </TouchableOpacity>
      </View>

      {/* Modallar */}
      <Modal visible={!!fetchError} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="bg-white w-full rounded-3xl p-6">
            <Text className="text-lg font-black mb-2">Bağlantı Sorunu</Text>
            <Text className="text-base mb-4">{fetchError}</Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-slate-200 h-12 rounded-2xl items-center justify-center"
                onPress={async () => {
                  try {
                    await clearWordsCache?.();
                  } catch (_) { }
                  setFetchError(null);
                  initGame();
                }}
              >
                <Text className="text-slate-800 font-black">Tekrar Dene</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-cyan-700 h-12 rounded-2xl items-center justify-center"
                onPress={() => {
                  setFetchError(null);
                  navigation.navigate("Home");
                }}
              >
                <Text className="text-white font-black">Çıkış</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!state.isActive && !state.isGameOver && state.timeLeft > 0 && !fetchError}
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

            <Text className="text-fuchsia-700 text-3xl font-black mb-1 text-center">
              {prevTeamName}
            </Text>
            <Text className="text-5xl font-black text-slate-800 mb-2">{prevTeamScore}</Text>

            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
              TUR {roundLabel}
            </Text>

            <View className="w-full h-[1px] bg-slate-100 mb-6" />

            <Text className="text-slate-500 font-bold mb-8 text-center text-lg leading-6">
              Harika iş çıkardınız!{"\n"}Şimdi sıra{" "}
              <Text className="text-fuchsia-700 font-black">{activeTeamName}</Text> ekibinde.
            </Text>

            <TouchableOpacity
              className="bg-red-500 w-full py-6 rounded-3xl shadow-xl active:bg-indigo-700 active:scale-95"
              onPress={startNextTurn}
            >
              <Text className="text-white font-black text-center text-xl uppercase tracking-widest">
                {activeTeamName} BAŞLASIN!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}