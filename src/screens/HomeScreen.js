import React from "react";
import { View, Text, TouchableOpacity, StatusBar, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useGameStore from "../store/useGameStore";

export default function HomeScreen({ navigation }) {
    const { resetGame } = useGameStore();

    const handleStart = () => {
        resetGame();
        navigation.navigate("Game");
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" />

            {/* Üst Alan */}
            <View className="flex-1 justify-center items-center px-8">
                {/* Glow / Hero arka plan */}
                <View className="absolute -top-24 w-[420px] h-[420px] rounded-full bg-indigo-200/40" />
                <View className="absolute top-24 w-[280px] h-[280px] rounded-full bg-indigo-300/30" />

                {/* Logo */}
                <View className="items-center justify-center mb-6">

                    <Image
                        source={require("../../assets/logo.png")}
                        className="w-96 h-96"   // responsive: 224x224
                        resizeMode="contain"
                    />

                </View>

                {/* Başlık: alt alta */}
                <View className="items-center">
                    <Text className="text-6xl font-black text-slate-900 tracking-tighter mb-2">
                        TABU
                    </Text>
                    <Text className="text-3xl font-extrabold text-indigo-600 tracking-widest -mt-2">
                        KELİME
                    </Text>
                </View>

                <Text className="text-slate-500 font-semibold text-base mt-4 text-center px-4">
                    Arkadaşlarınla eğlenceye hazır mısın?
                </Text>
            </View>

            {/* Alt Alan: Butonlar */}
            <View className="px-8 pb-10 space-y-4">
                <TouchableOpacity
                    className="bg-indigo-600 py-6 rounded-3xl shadow-2xl shadow-indigo-300 flex-row justify-center items-center active:scale-95"
                    onPress={handleStart}
                >
                    <Ionicons name="play" size={24} color="white" />
                    <Text className="text-white text-2xl font-black uppercase italic tracking-widest ml-3">
                        BAŞLA!
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="bg-slate-100 py-5 rounded-3xl flex-row justify-center items-center active:bg-slate-200"
                    onPress={() => navigation.navigate("Settings")}
                >
                    <Ionicons name="settings-sharp" size={20} color="#64748b" />
                    <Text className="text-slate-600 text-lg font-bold uppercase tracking-widest ml-3">
                        AYARLAR
                    </Text>
                </TouchableOpacity>

                <Text className="text-center text-slate-300 text-xs mt-4 font-bold uppercase tracking-tighter">
                    v1.0.0 - Tabu Kelime
                </Text>
            </View>
        </SafeAreaView>
    );
}
