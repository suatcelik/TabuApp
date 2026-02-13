import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import useGameStore from '../store/useGameStore';

const GameScreen = ({ navigation }) => {
    const {
        currentWord,
        currentScore,
        passCount,
        isLoading,
        error,
        prepareGame,
        handleCorrect,
        handleTaboo,
        handlePass,
        settings,
        currentTeam
    } = useGameStore();

    useEffect(() => {
        prepareGame();
    }, []);

    // 1. YÜKLENİYOR EKRANI
    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-zinc-900">
                <ActivityIndicator size="large" color="#FFD700" />
                <Text className="text-white mt-4 font-medium">Kelimeler Hazırlanıyor...</Text>
            </View>
        );
    }

    // 2. HATA EKRANI
    if (error || !currentWord) {
        return (
            <View className="flex-1 justify-center items-center bg-zinc-900 p-6">
                <Text className="text-red-500 text-lg text-center mb-6 font-bold">
                    {error || "Bir sorun oluştu!"}
                </Text>
                <TouchableOpacity
                    className="bg-yellow-500 px-8 py-4 rounded-2xl"
                    onPress={prepareGame}
                >
                    <Text className="text-black font-bold text-lg">Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-zinc-900">
            <View className="flex-1 px-6 pt-10">

                {/* Üst Bilgi Çubuğu */}
                <View className="flex-row justify-between items-center mb-10">
                    <Text className="text-yellow-500 text-xl font-bold">
                        Takım: {currentTeam}
                    </Text>
                    <View className="bg-yellow-500 px-4 py-1 rounded-full shadow-lg">
                        <Text className="text-black font-extrabold text-lg">
                            Puan: {currentScore}
                        </Text>
                    </View>
                    <Text className="text-zinc-400 text-lg">
                        Pas: {passCount}/{settings.maxPass}
                    </Text>
                </View>

                {/* Kelime Kartı */}
                <View className="bg-zinc-800 rounded-[40px] p-10 items-center shadow-2xl border border-zinc-700">
                    <Text className="text-yellow-500 text-5xl font-black text-center mb-6 tracking-tighter">
                        {currentWord.targetWord?.toUpperCase()}
                    </Text>

                    <View className="w-full h-[1px] bg-zinc-700 mb-6" />

                    <View className="space-y-4 items-center">
                        {currentWord.forbiddenWords?.map((word, index) => (
                            <Text key={index} className="text-white text-2xl font-semibold tracking-widest opacity-90">
                                {word.toUpperCase()}
                            </Text>
                        ))}
                    </View>
                </View>

                {/* Aksiyon Butonları */}
                <View className="flex-row justify-between mt-auto mb-10 space-x-3">
                    {/* TABU */}
                    <TouchableOpacity
                        className="flex-1 h-20 bg-red-600 justify-center items-center rounded-3xl active:bg-red-700"
                        onPress={handleTaboo}
                    >
                        <Text className="text-white font-black text-xl italic">TABU</Text>
                    </TouchableOpacity>

                    {/* PAS */}
                    <TouchableOpacity
                        className={`flex-1 h-20 justify-center items-center rounded-3xl ${passCount >= settings.maxPass ? 'bg-zinc-700 opacity-50' : 'bg-zinc-600 active:bg-zinc-500'}`}
                        onPress={handlePass}
                        disabled={passCount >= settings.maxPass}
                    >
                        <Text className="text-white font-black text-xl italic">PAS</Text>
                    </TouchableOpacity>

                    {/* DOĞRU */}
                    <TouchableOpacity
                        className="flex-1 h-20 bg-green-600 justify-center items-center rounded-3xl active:bg-green-700"
                        onPress={handleCorrect}
                    >
                        <Text className="text-white font-black text-xl italic">DOĞRU</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </SafeAreaView>
    );
};

export default GameScreen;