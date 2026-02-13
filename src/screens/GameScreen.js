import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, StatusBar } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import useGameStore from '../store/useGameStore';
import { getRandomWord } from '../services/wordService';

export default function GameScreen({ navigation }) {
    // Zustand Store
    const { settings, updateTotalScore } = useGameStore();

    // Oyun State'leri
    const [currentWord, setCurrentWord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [score, setScore] = useState(0);
    const [timer, setTimer] = useState(settings.duration);
    const [passCount, setPassCount] = useState(settings.maxPass);
    const [team, setTeam] = useState('A');
    const [round, setRound] = useState(1);
    const [isRoundActive, setIsRoundActive] = useState(true);

    // 1. Kelime Getirme Fonksiyonu
    const fetchNewWord = useCallback(async () => {
        setLoading(true);
        const word = await getRandomWord();
        setCurrentWord(word);
        setLoading(false);
    }, []);

    // 2. Ses Çalma Fonksiyonu
    async function playSound(type) {
        try {
            const { sound } = await Audio.Sound.createAsync(
                type === 'SUCCESS'
                    ? require('../../assets/success.mp3')
                    : require('../../assets/error.mp3')
            );
            await sound.playAsync();
            // Çaldıktan sonra belleği boşaltmak için otomatik kapatma
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) sound.unloadAsync();
            });
        } catch (error) {
            console.log('Ses hatası:', error);
        }
    }

    // 3. Zamanlayıcı ve Tur Kontrolü
    useEffect(() => {
        let interval;
        if (isRoundActive && timer > 0) {
            interval = setInterval(() => setTimer((t) => t - 1), 1000);
        } else if (timer === 0 && isRoundActive) {
            handleRoundEnd();
        }
        return () => clearInterval(interval);
    }, [timer, isRoundActive]);

    useEffect(() => {
        fetchNewWord();
        // Audio Mode Ayarı
        Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    }, [fetchNewWord]);

    // 4. Aksiyonlar (Doğru, Pas, Tabu)
    const handleAction = async (type) => {
        if (!isRoundActive) return;

        if (type === 'SUCCESS') {
            setScore(s => s + 1);
            if (settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playSound('SUCCESS');
        } else if (type === 'TABOO') {
            setScore(s => s - 1);
            if (settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            playSound('ERROR');
        } else if (type === 'PASS') {
            if (passCount > 0) {
                setPassCount(p => p - 1);
            } else {
                return; // Pas hakkı yoksa bir şey yapma
            }
        }
        fetchNewWord();
    };

    // 5. Tur Sonu İşlemleri
    const handleRoundEnd = () => {
        setIsRoundActive(false);
        updateTotalScore(team, score);

        // Eğer 2. tur da bittiyse sonuç ekranına git
        if (round === 2) {
            setTimeout(() => navigation.navigate('Result'), 1500);
        }
    };

    const startNextTurn = () => {
        setTeam('B');
        setRound(2);
        setScore(0);
        setTimer(settings.duration);
        setPassCount(settings.maxPass);
        setIsRoundActive(true);
        fetchNewWord();
    };

    if (loading && !currentWord) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />

            {/* Üst Bilgi Çubuğu */}
            <View className="flex-row justify-between items-center px-6 py-4 bg-white shadow-sm">
                <View className="items-center">
                    <Text className="text-slate-400 text-xs font-bold uppercase">Skor</Text>
                    <Text className="text-indigo-600 text-3xl font-black">{score}</Text>
                </View>

                <View className="bg-indigo-600 px-6 py-2 rounded-2xl shadow-lg shadow-indigo-200">
                    <Text className="text-white font-black text-xl">
                        {Math.floor(timer / 60)}:{timer % 60 < 10 ? `0${timer % 60}` : timer % 60}
                    </Text>
                </View>

                <View className="items-center">
                    <Text className="text-slate-400 text-xs font-bold uppercase">Pas</Text>
                    <Text className="text-amber-500 text-3xl font-black">{passCount}</Text>
                </View>
            </View>

            {/* Kelime Kartı */}
            <View className="flex-1 justify-center px-8">
                <View className="bg-white rounded-[45px] shadow-2xl overflow-hidden border border-slate-100">
                    <View className="bg-indigo-500 py-10 items-center">
                        <Text className="text-white text-4xl font-black uppercase tracking-tighter">
                            {currentWord?.targetWord}
                        </Text>
                    </View>

                    <View className="py-10 items-center">
                        {currentWord?.forbiddenWords?.map((word, index) => (
                            <View key={index} className="py-2 w-full items-center">
                                <Text className="text-slate-600 text-2xl font-bold uppercase tracking-tight">
                                    {word}
                                </Text>
                                {index < 4 && <View className="w-1/2 h-[1px] bg-slate-100 mt-2" />}
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* Kontrol Butonları */}
            <View className="flex-row justify-between px-6 pb-10 space-x-4">
                <TouchableOpacity
                    className="flex-1 bg-rose-500 h-24 rounded-3xl items-center justify-center shadow-lg shadow-rose-200 active:scale-95"
                    onPress={() => handleAction('TABOO')}
                >
                    <Ionicons name="close-circle" size={32} color="white" />
                    <Text className="text-white font-black uppercase mt-1">Tabu</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-amber-400 h-24 rounded-3xl items-center justify-center shadow-lg shadow-amber-200 active:scale-95"
                    onPress={() => handleAction('PASS')}
                >
                    <Ionicons name="refresh-circle" size={32} color="white" />
                    <Text className="text-white font-black uppercase mt-1">Pas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-emerald-500 h-24 rounded-3xl items-center justify-center shadow-lg shadow-emerald-200 active:scale-95"
                    onPress={() => handleAction('SUCCESS')}
                >
                    <Ionicons name="checkmark-circle" size={32} color="white" />
                    <Text className="text-white font-black uppercase mt-1">Doğru</Text>
                </TouchableOpacity>
            </View>

            {/* Tur Değişimi Modalı */}
            <Modal visible={!isRoundActive && round === 1} transparent animationType="fade">
                <View className="flex-1 bg-indigo-900/95 items-center justify-center px-10">
                    <View className="bg-white w-full p-10 rounded-[50px] items-center shadow-2xl">
                        <Text className="text-slate-400 font-bold uppercase mb-2">Tur Tamamlandı</Text>
                        <Text className="text-indigo-600 text-4xl font-black mb-2 text-center">Takım A: {score}</Text>
                        <Text className="text-slate-600 font-medium mb-8 text-center italic">Sıra Takım B'de!</Text>

                        <TouchableOpacity
                            className="bg-indigo-600 w-full py-6 rounded-3xl shadow-xl active:bg-indigo-700"
                            onPress={startNextTurn}
                        >
                            <Text className="text-white font-black text-center text-xl uppercase tracking-widest">
                                HAZIRIZ!
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}