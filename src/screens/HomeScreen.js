import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Expo ile hazır gelir

export default function HomeScreen({ navigation }) {
    return (
        <SafeAreaView className="flex-1 bg-indigo-600">
            <StatusBar barStyle="light-content" />

            {/* Üst Ayar Butonu */}
            <View className="flex-row justify-end px-6 pt-4">
                <TouchableOpacity
                    onPress={() => navigation.navigate('Settings')}
                    className="bg-white/20 p-3 rounded-full"
                >
                    <Ionicons name="settings-sharp" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 items-center justify-around p-6">

                {/* Logo ve Başlık Alanı */}
                <View className="items-center">
                    <View className="bg-white/20 p-10 rounded-[50px] rotate-6 shadow-2xl border border-white/30">
                        <Text className="text-white text-8xl font-black italic tracking-tighter shadow-black">
                            TABU
                        </Text>
                    </View>
                    <Text className="text-indigo-100 mt-8 text-xl font-medium tracking-widest uppercase">
                        Kelime Avcıları
                    </Text>
                </View>

                {/* Butonlar Grubu */}
                <View className="w-full space-y-4">
                    <TouchableOpacity
                        className="bg-white w-full py-6 rounded-3xl shadow-xl active:scale-95 active:bg-slate-100"
                        onPress={() => navigation.navigate('Game')}
                    >
                        <Text className="text-indigo-600 text-center text-2xl font-black italic">
                            OYUNU BAŞLAT
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-indigo-500/50 w-full py-4 rounded-3xl border border-indigo-400"
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Text className="text-white text-center text-lg font-bold uppercase">
                            Oyun Ayarları
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Alt Bilgi */}
                <Text className="text-indigo-200/50 text-sm font-bold tracking-widest">
                    VERSION 1.0.0
                </Text>
            </View>
        </SafeAreaView>
    );
}