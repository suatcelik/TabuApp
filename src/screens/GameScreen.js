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

// Servisler
import { loadWordsOfflineFirst, clearWordsCache } from "../services/wordService";
import { gameReducer, initialState } from "../reducers/gameReducer";
import { saveScore } from "../services/leaderboardService";
import { logRoundEnd } from "../services/analyticsService";
import useGameStore from "../store/useGameStore";

// --- SABİTLER ---
const LAST_FIRST_WORD_KEY = "LAST_FIRST_WORD_V1";
const CARD_COLORS = ["bg-fuchsia-700", "bg-amber-400", "bg-sky-500"];

// --- YARDIMCI FONKSİYONLAR ---

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
  // Reducer ve State
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [fetchError, setFetchError] = useState(null);

  // Store Bağlantısı
  const settings = useGameStore((s) => s.settings);
  const setFinalScores = useGameStore((s) => s.setFinalScores);

  // Ses Oynatıcılar
  const successPlayer = useAudioPlayer(require("../../assets/success.mp3"));
  const errorPlayer = useAudioPlayer(require("../../assets/error.mp3"));
  const tickSlowPlayer = useAudioPlayer(require("../../assets/tick_slow.mp3"));

  // Referanslar
  const intervalRef = useRef(null);
  const hasPlayedTickRef = useRef(false);

  // Ses Çalma
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

  // 1. OYUN BAŞLATMA
  const initGame = useCallback(async () => {
    try {
      setFetchError(null);

      // Kelimeleri getir
      const { words } = await loadWordsOfflineFirst(200);

      const list = Array.isArray(words) ? words : [];
      let shuffled = shuffleWords(list);

      shuffled = await ensureDifferentFirstWord(shuffled);

      dispatch({ type: "SET_WORDS", payload: shuffled });

      if (shuffled.length > 0) {
        AsyncStorage.setItem(LAST_FIRST_WORD_KEY, shuffled[0]?.targetWord || "").catch(() => { });
      }

    } catch (e) {
      console.log("Game Init Error:", e);
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

  // 2. AYARLARI GÜNCELLE
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

  // 3. GERİ TUŞU KORUMASI (DÜZELTİLDİ: Oyunun devam etme sorunu çözüldü)
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
                // ✅ KRİTİK DÜZELTME: Timer'ı manuel olarak hemen durdur
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }

                // ✅ KRİTİK DÜZELTME: Sesleri durdur
                stopTickSlow();

                // ✅ KRİTİK DÜZELTME: Stack'i temizleyerek çık (popToTop)
                // navigate("Home") yerine popToTop kullanarak ekranı öldürüyoruz
                if (navigation.canGoBack()) {
                  navigation.popToTop();
                } else {
                  navigation.replace("Home");
                }
              }
            }
          ]
        );
        return true;
      }
      // Oyun bittiyse normal geri çalışsın
      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () => {
      subscription.remove();
    };
  }, [state.isGameOver, navigation]);

  // 4. ZAMANLAYICI
  useEffect(() => {
    if (!state.isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    // Varsa temizle
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Yeni başlat
    intervalRef.current = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [state.isActive]);

  // 5. SON SANİYE SESİ
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

  // 6. TUR SONU
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

  // 7. OYUN BİTTİ
  useEffect(() => {
    if (!state.isGameOver) return;

    let cancelled = false;

    // Timer'ı durdur
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    const navTimer = setTimeout(() => {
      if (cancelled) return;
      navigation?.replace?.("Result");
    }, 350);

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

  // --- AKSİYONLAR ---
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

  // --- RENDER ---
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

  const currentColor = CARD_COLORS[(state.currentIndex ?? 0) % CARD_COLORS.length];
  const headerTextColor = currentColor === "bg-amber-400" ? "text-slate-900" : "text-white";

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />

      {/* Üst Bilgi */}
      <View className="flex-row justify-between items-center px-6 py-4 bg-white shadow-sm">
        <View className="items-center flex-1">
          <Text className="text-slate-400 text-[10px] font-bold uppercase" numberOfLines={1}>
            {activeTeamName}
          </Text>
          <Text className="text-sky-500 text-3xl font-black">
            {state.activeTeam === "A" ? state.teamAScore : state.teamBScore}
          </Text>
        </View>

        <View className="items-center mx-4">
          <View className="flex-row items-center bg-fuchsia-700 px-6 py-3 rounded-2xl shadow-lg shadow-indigo-200">
            <Ionicons name="hourglass-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text className="text-white font-black text-xl">
              {mm}:{ss}
            </Text>
          </View>
          <Text className="text-slate-400 text-[10px] font-bold uppercase mt-2">
            TUR {roundLabel}
          </Text>
        </View>

        <View className="items-center flex-1">
          <Text className="text-slate-400 text-[10px] font-bold uppercase">Pas</Text>
          <Text className="text-amber-400 text-3xl font-black">{state.passCount}</Text>
        </View>
      </View>

      {/* Kart */}
      <View className="flex-1 justify-center px-8">
        <View className="bg-white rounded-[45px] shadow-2xl overflow-hidden border border-slate-100">
          <View className={`${currentColor} py-10 items-center`}>
            <Text className={`${headerTextColor} text-4xl font-black uppercase tracking-tighter text-center px-4`}>
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

      {/* Butonlar */}
      <View className="flex-row px-6 pb-10 gap-4">
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
          <Text className="text-white font-black uppercase mt-1 ">Pas</Text>
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
                  try { await clearWordsCache?.(); } catch (_) { }
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
            <Text className="text-5xl font-black text-slate-800 mb-2">
              {prevTeamScore}
            </Text>

            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
              TUR {roundLabel}
            </Text>

            <View className="w-full h-[1px] bg-slate-100 mb-6" />

            <Text className="text-slate-500 font-bold mb-8 text-center text-lg leading-6">
              Harika iş çıkardınız!{"\n"}Şimdi sıra{" "}
              <Text className="text-fuchsia-700 font-black">{activeTeamName}</Text> ekibinde.
            </Text>

            <TouchableOpacity
              className="bg-fuchsia-700 w-full py-6 rounded-3xl shadow-xl active:bg-indigo-700 active:scale-95"
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