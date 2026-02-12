import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import useGameStore from '../store/useGameStore'; // Zustand Store
import { getRandomWord } from '../services/wordService';

export default function GameScreen({ navigation }) {
    // Zustand'dan gerekli state ve fonksiyonları alıyoruz
    const { settings, updateTotalScore } = useGameStore();

    const [currentWord, setCurrentWord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [score, setScore] = useState(0);
    const [timer, setTimer] = useState(settings.duration);
    const [passCount, setPassCount] = useState(settings.maxPass);
    const [team, setTeam] = useState('A');
    const [isRoundActive, setIsRoundActive] = useState(true);
    const [roundCount, setRoundCount] = useState(1);

    useEffect(() => {
        let interval;
        if (isRoundActive && timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        } else if (timer === 0) {
            handleRoundEnd();
        }
        return () => clearInterval(interval);
    }, [timer, isRoundActive]);

    useEffect(() => { fetchNewWord(); }, []);

    const playSound = async (type) => {
        try {
            const soundFile = type === 'correct'
                ? require('../../assets/sounds/correct.mp3')
                : require('../../assets/sounds/wrong.mp3');
            const { sound } = await Audio.Sound.createAsync(soundFile);
            await sound.playAsync();
        } catch (e) { console.log("Ses hatası"); }
    };

    const fetchNewWord = async () => {
        setLoading(true);
        const word = await getRandomWord();
        setCurrentWord(word);
        setLoading(false);
    };

    const handleAction = async (type) => {
        if (type === 'SUCCESS') {
            setScore(s => s + 1);
            if (settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playSound('correct');
        } else if (type === 'TABOO') {
            setScore(s => s - 1);
            if (settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            playSound('wrong');
        } else if (type === 'PASS') {
            if (passCount > 0) {
                setPassCount(p => p - 1);
                if (settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else return;
        }
        fetchNewWord();
    };

    const handleRoundEnd = () => {
        setIsRoundActive(false);
        updateTotalScore(team, score); // Skoru Zustand'a kaydet

        if (roundCount === 2) {
            // 2. tur bittiyse sonuç ekranına git
            const finalScores = useGameStore.getState().totalScores;
            setTimeout(() => navigation.navigate('Result', { scores: finalScores }), 800);
        }
    };

    const startNextTurn = () => {
        setTeam('B'); setRoundCount(2); setScore(0);
        setTimer(settings.duration); setPassCount(settings.maxPass);
        setIsRoundActive(true); fetchNewWord();
    };

    if (loading && !currentWord) return <View className="flex-1 justify-center bg-white"><ActivityIndicator size="large" color="#4f46e5" /></View>;

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            {/* Üst Panel */}
            <View className="flex-row justify-between items-center px-6 py-4 bg-white shadow-sm">
                <View>
                    <Text className="text-slate-400 text-xs font-bold uppercase">TAKIM {team}</Text>
                    <Text className="text-indigo-600 text-3xl font-black">{score}</Text>
                </View>
                <View className={`px-5 py-2 rounded-2xl ${timer <= 10 ? 'bg-red-500' : 'bg-indigo-100'}`}>
                    <Text className={`font-mono text-2xl font-bold ${timer <= 10 ? 'text-white' : 'text-indigo-600'}`}>
                        00:{timer < 10 ? `0${timer}` : timer}
                    </Text>
                </View>
                <View>
                    <Text className="text-slate-400 text-xs font-bold text-right">PAS</Text>
                    <Text className="text-amber-500 text-2xl font-black text-right">{passCount}</Text>
                </View>
            </View>

            {/* Kelime Kartı */}
            <View className="flex-1 justify-center px-8">
                <View className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
                    <View className="bg-indigo-500 py-10 items-center">
                        <Text className="text-white text-4xl font-black uppercase tracking-tight">{currentWord?.targetWord}</Text>
                    </View>
                    <View className="py-12 items-center">
                        {currentWord?.forbiddenWords?.map((w, i) => (
                            <Text key={i} className="text-slate-600 text-2xl font-semibold mb-4 italic">{w}</Text>
                        ))}
                    </View>
                </View>
            </View>

            {/* Alt Butonlar */}
            <View className="flex-row justify-between px-6 pb-12 space-x-4">
                <TouchableOpacity className="flex-1 bg-red-500 h-20 rounded-3xl items-center justify-center shadow-lg" onPress={() => handleAction('TABOO')}>
                    <Text className="text-white font-black italic">TABU</Text>
                </TouchableOpacity>
                <TouchableOpacity className={`flex-1 h-20 rounded-3xl items-center justify-center shadow-lg ${passCount > 0 ? 'bg-amber-400' : 'bg-slate-300'}`} onPress={() => handleAction('PASS')}>
                    <Text className="text-white font-black italic uppercase">Pas</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 bg-emerald-500 h-20 rounded-3xl items-center justify-center shadow-lg" onPress={() => handleAction('SUCCESS')}>
                    <Text className="text-white font-black italic uppercase">Doğru</Text>
                </TouchableOpacity>
            </View>

            {/* Tur Geçiş Modalı */}
            <Modal visible={!isRoundActive && roundCount === 1} transparent animationType="fade">
                <View className="flex-1 bg-indigo-950/95 items-center justify-center px-10">
                    <View className="bg-white w-full p-10 rounded-[40px] items-center">
                        <Text className="text-indigo-600 text-4xl font-black mb-8 italic text-center uppercase">Sıra Takım B'de!</Text>
                        <TouchableOpacity className="bg-indigo-600 w-full py-5 rounded-2xl" onPress={startNextTurn}>
                            <Text className="text-white font-black text-center text-xl tracking-widest">HAZIRIZ</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}