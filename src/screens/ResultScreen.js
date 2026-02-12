import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import useGameStore from '../store/useGameStore';
import { Ionicons } from '@expo/vector-icons';

export default function ResultScreen({ navigation }) {
    // Zustand store'dan skorları ve oyunu sıfırlama fonksiyonunu alıyoruz
    const { totalScores, resetGame } = useGameStore();
    const [showConfetti, setShowConfetti] = useState(false);

    // Kazananı belirle
    const winner = totalScores.A > totalScores.B ? 'A' : totalScores.B > totalScores.A ? 'B' : 'Berabere';

    useEffect(() => {
        // Eğer bir kazanan varsa konfeti patlat
        if (winner !== 'Berabere') {
            setShowConfetti(true);
        }
    }, []);

    const handleNewGame = () => {
        resetGame(); // Skorları sıfırla
        navigation.navigate('Home'); // Ana menüye dön
    };

    return (
        <SafeAreaView className="flex-1 bg-indigo-900">
            <StatusBar barStyle="light-content" />

            {/* Konfeti Efekti */}
            {showConfetti && (
                <ConfettiCannon
                    count={200}
                    origin={{ x: -10, y: 0 }}
                    fadeOut={true}
                    fallSpeed={3000}
                />
            )}

            <View className="flex-1 items-center justify-center px-6">

                {/* Taç İkonu ve Başlık */}
                <View className="bg-amber-400 p-6 rounded-full mb-6 shadow-2xl">
                    <Ionicons name="trophy" size={60} color="white" />
                </View>

                <Text className="text-white text-5xl font-black mb-2 uppercase italic tracking-tighter text-center">
                    Oyun Bitti!
                </Text>

                <Text className="text-indigo-200 text-lg font-bold mb-12 uppercase tracking-widest">
                    {winner === 'Berabere' ? 'Dostluk Kazandı!' : `TAKIM ${winner} KAZANDI!`}
                </Text>

                {/* Skor Tablosu */}
                <View className="w-full bg-white/10 p-8 rounded-[40px] border border-white/20 shadow-xl mb-12">
                    <View className="flex-row justify-around items-center">

                        {/* Takım A */}
                        <View className="items-center">
                            <Text className="text-indigo-300 font-bold mb-2">TAKIM A</Text>
                            <Text className={`text-6xl font-black ${winner === 'A' ? 'text-amber-400' : 'text-white'}`}>
                                {totalScores.A}
                            </Text>
                        </View>

                        {/* Ayırıcı Çizgi */}
                        <View className="h-16 w-[1px] bg-white/20" />

                        {/* Takım B */}
                        <View className="items-center">
                            <Text className="text-indigo-300 font-bold mb-2">TAKIM B</Text>
                            <Text className={`text-6xl font-black ${winner === 'B' ? 'text-amber-400' : 'text-white'}`}>
                                {totalScores.B}
                            </Text>
                        </View>

                    </View>
                </View>

                {/* Butonlar */}
                <View className="w-full space-y-4">
                    <TouchableOpacity
                        className="bg-amber-400 w-full py-6 rounded-3xl shadow-2xl active:scale-95"
                        onPress={handleNewGame}
                    >
                        <Text className="text-indigo-900 text-center text-2xl font-black uppercase italic">
                            YENİ OYUN
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="w-full py-4 rounded-3xl border border-white/30"
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Text className="text-white text-center text-lg font-bold uppercase tracking-widest">
                            ANA MENÜYE DÖN
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </SafeAreaView>
    );
}