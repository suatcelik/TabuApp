// src/screens/GameScreen.js

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
import { checkAndShowAd } from "../services/adService"; // REKLAM SERVİSİ EKLENDİ

const LAST_FIRST_WORD_KEY = "LAST_FIRST_WORD_V1";
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
  } catch (_) { return words; }
};

export default function GameScreen({ navigation }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [fetchError, setFetchError] = useState(null);
  const [isAdShowing, setIsAdShowing] = useState(false); // Reklam gösterilirken UI'ı bekletmek için

  const settings = useGameStore((s) => s.settings);
  const setFinalScores = useGameStore((s) => s.setFinalScores);
  const isPremium = useGameStore((s) => s.isPremium);

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
    try { if (tickSlowPlayer.playing) tickSlowPlayer.pause(); } catch (_) { }
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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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
        Alert.alert("Oyundan Çık?", "Oyun devam ediyor. Çıkarsanız ilerlemeniz kaybolacak.", [
          { text: "İptal", style: "cancel" },
          {
            text: "Çık",
            style: "destructive",
            onPress: () => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              stopTickSlow();
              navigation.replace("Home");
            },
          },
        ]);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [state.isGameOver]);

  useEffect(() => {
    if (!state.isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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

  // REKLAM VE TUR DEĞİŞİM MANTIĞI GÜNCELLENDİ
  useEffect(() => {
    if (state.timeLeft === 0 && state.isActive === false && !state.isGameOver) {
      const teamScore = state.activeTeam === "A" ? state.teamAScore : state.teamBScore;
      logRoundEnd(state.activeTeam, teamScore);

      const handleNext = () => {
        dispatch({
          type: "NEXT_ROUND",
          payload: {
            duration: settings?.duration,
            maxPass: settings?.maxPass,
            roundsPerTeam: settings?.roundsPerTeam,
          },
        });
        setIsAdShowing(false);
      };

      // 2 Turda Bir Reklam Göster (Hem A hem B oynadıktan sonra)
      // Sıradaki takım A olacaksa, önceki tur B ile bitti demektir.
      // state.roundNumber o anki turu temsil ediyorsa ve çift sayı ise reklam gösteririz.
      if (!isPremium && state.activeTeam === "B" && state.roundNumber % 2 === 0) {
        setIsAdShowing(true);
        checkAndShowAd(handleNext).then(didShow => {
          if (!didShow) handleNext();
        }).catch(() => handleNext());
      } else {
        handleNext();
      }
    }
  }, [state.timeLeft, state.isActive, state.isGameOver, state.activeTeam, settings, isPremium, state.roundNumber]);

  useEffect(() => {
    if (!state.isGameOver) return;
    setFinalScores({ A: state.teamAScore, B: state.teamBScore });
    navigation.replace("Result");
  }, [state.isGameOver]);

  const onCorrect = () => { if (state.isActive) { dispatch({ type: "SUCCESS" }); playSound("SUCCESS"); } };
  const onTaboo = () => { if (state.isActive) { dispatch({ type: "TABOO" }); playSound("ERROR"); } };
  const onPass = () => { if (state.isActive) dispatch({ type: "PASS" }); };
  const startNextTurn = () => { hasPlayedTickRef.current = false; dispatch({ type: "START_TURN" }); };

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
  const prevTeamName = state.activeTeam === "A" ? settings?.teamBName : settings?.teamAName;
  const prevTeamScore = state.activeTeam === "A" ? state.teamBScore : state.teamAScore;
  const timer = state.timeLeft || 0;
  const mm = Math.floor(timer / 60);
  const ss = timer % 60 < 10 ? `0${timer % 60}` : timer % 60;
  const totalRounds = state.roundsPerTeam ?? settings?.roundsPerTeam ?? 4;
  const roundLabel = `${state.roundNumber ?? 1}/${totalRounds}`;

  // TEMA RENDER
  const renderThemeBackground = () => {
    const theme = settings?.selectedTheme || "default";
    const IconPattern = ({ color, opacity = 0.1 }) => (
      <View className="absolute inset-0 overflow-hidden" style={{ opacity }} pointerEvents="none">
        <Ionicons name="ban" size={120} color={color} style={{ position: "absolute", top: -20, left: -20, transform: [{ rotate: "-15deg" }] }} />
        <Ionicons name="chatbubbles" size={100} color={color} style={{ position: "absolute", top: 40, right: -10, transform: [{ rotate: "10deg" }] }} />
      </View>
    );
    return <View className="absolute inset-0 bg-slate-50" pointerEvents="none"><IconPattern color="#94a3b8" opacity={0.05} /></View>;
  };

  const currentColor = CARD_COLORS[(state.currentIndex ?? 0) % CARD_COLORS.length];
  const headerTextColor = currentColor === "bg-amber-400" ? "text-slate-900" : "text-white";

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />
      {renderThemeBackground()}

      {/* Üst Bilgi */}
      <View className="flex-row justify-between items-center px-6 py-4 bg-white/80 shadow-sm z-10">
        <View className="items-center flex-1">
          <Text className="text-slate-500 text-[10px] font-bold uppercase">{activeTeamName}</Text>
          <Text className="text-sky-500 text-3xl font-black">{state.activeTeam === "A" ? state.teamAScore : state.teamBScore}</Text>
        </View>
        <View className="items-center mx-4">
          <View className="flex-row items-center bg-red-500 px-6 py-3 rounded-2xl shadow-lg">
            <Ionicons name="hourglass-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text className="text-white font-black text-xl">{mm}:{ss}</Text>
          </View>
          <Text className="text-slate-500 text-[10px] font-bold uppercase mt-2">TUR {roundLabel}</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-slate-500 text-[10px] font-bold uppercase">Pas</Text>
          <Text className="text-amber-400 text-3xl font-black">{state.passCount}</Text>
        </View>
      </View>

      {/* Kart */}
      <View className="flex-1 justify-center px-8 z-10">
        <View className="rounded-[45px] shadow-2xl overflow-hidden border bg-white border-slate-100">
          <View className={`${currentColor} py-10 items-center`}>
            <Text className={`${headerTextColor} text-4xl font-black uppercase text-center px-4`}>{currentWord?.targetWord ?? "—"}</Text>
          </View>
          <View className="py-10 items-center">
            {(currentWord?.forbiddenWords ?? []).map((word, idx) => (
              <View key={idx} className="py-2 w-full items-center">
                <Text className="text-slate-800 text-2xl font-bold uppercase">{word}</Text>
                {idx < 4 && <View className="w-1/2 h-[1px] mt-2 bg-slate-100" />}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Butonlar */}
      <View className="flex-row px-6 pb-10 gap-4 z-10">
        <TouchableOpacity className="flex-1 bg-fuchsia-700 h-24 rounded-3xl items-center justify-center active:scale-95" onPress={onTaboo} disabled={!state.isActive}>
          <Ionicons name="close-circle" size={32} color="white" />
          <Text className="text-white font-black uppercase mt-1">Tabu</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-amber-400 h-24 rounded-3xl items-center justify-center active:scale-95" onPress={onPass} disabled={!state.isActive}>
          <Ionicons name="refresh-circle" size={32} color="white" />
          <Text className="text-white font-black uppercase mt-1">Pas</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-sky-500 h-24 rounded-3xl items-center justify-center active:scale-95" onPress={onCorrect} disabled={!state.isActive}>
          <Ionicons name="checkmark-circle" size={32} color="white" />
          <Text className="text-white font-black uppercase mt-1">Doğru</Text>
        </TouchableOpacity>
      </View>

      {/* Tur Geçiş Modalı */}
      <Modal visible={!state.isActive && !state.isGameOver && state.timeLeft > 0 && !isAdShowing} transparent animationType="slide">
        <View className="flex-1 bg-indigo-900/98 items-center justify-center px-6">
          <View className="bg-white w-full p-8 rounded-[50px] items-center">
            <Text className="text-slate-400 font-bold uppercase text-xs mb-2">Tur Sonucu</Text>
            <Text className="text-fuchsia-700 text-3xl font-black text-center">{prevTeamName}</Text>
            <Text className="text-5xl font-black text-slate-800 mb-2">{prevTeamScore}</Text>
            <View className="w-full h-[1px] bg-slate-100 my-6" />
            <Text className="text-slate-500 font-bold mb-8 text-center text-lg">Sıra <Text className="text-fuchsia-700 font-black">{activeTeamName}</Text> ekibinde.</Text>
            <TouchableOpacity className="bg-red-500 w-full py-6 rounded-3xl active:scale-95" onPress={startNextTurn}>
              <Text className="text-white font-black text-center text-xl uppercase tracking-widest">{activeTeamName} BAŞLASIN!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reklam Bekleme UI */}
      {isAdShowing && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center z-50">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-white font-bold mt-4">Reklam Hazırlanıyor...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}