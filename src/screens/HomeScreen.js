import React, { useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    Image,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useGameStore from "../store/useGameStore";
import { initIAP } from "../services/iapService";

export default function HomeScreen({ navigation }) {
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const resetGame = useGameStore((s) => s.resetGame);

    useEffect(() => {
        initIAP().catch((e) => console.log("Açılış IAP Başlatma Hatası:", e));
    }, []);

    const handleStart = () => {
        resetGame();
        navigation.navigate("Game");
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <View className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden" pointerEvents="none">
                    <View className="absolute -top-10 -left-10 w-80 h-80 rounded-full bg-fuchsia-200/60" />
                    <View className="absolute -top-5 -left-5 w-56 h-56 rounded-full bg-fuchsia-300/40" />
                    <View className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-rose-200/50" />
                    <View className="absolute top-0 right-0 w-48 h-48 rounded-full bg-rose-300/30" />
                    <View className="absolute top-1/3 -right-16 w-[350px] h-[350px] rounded-full bg-sky-200/50" />
                    <View className="absolute top-1/2 -right-10 w-64 h-64 rounded-full bg-sky-300/30" />
                    <View className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-amber-100/70" />
                    <View className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-amber-200/40" />
                </View>

                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-1 justify-center items-center px-8 py-10">
                        <View className="items-center justify-center pt-16">
                            <Image
                                source={require("../../assets/logo.png")}
                                className="w-80 h-80"
                                resizeMode="contain"
                                fadeDuration={0}
                            />
                        </View>

                        <View className="w-full mt-16 bg-white/90 p-6 rounded-[35px] border border-slate-800 shadow-xl shadow-slate-800">
                            <Text className="text-slate-500 text-center font-bold uppercase tracking-widest text-[10px] mb-4">
                                Takım İsimlerini Düzenle
                            </Text>

                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <TextInput
                                        value={settings?.teamAName}
                                        onChangeText={(t) => updateSettings({ teamAName: t })}
                                        placeholder="Takım A"
                                        placeholderTextColor="#94a3b8"
                                        className="bg-slate-50 border border-slate-800 rounded-2xl px-3 py-3 text-slate-800 font-extrabold text-center"
                                        maxLength={15}
                                    />
                                </View>

                                <View className="px-4">
                                    <Text className="font-black text-red-500 text-lg italic">VS</Text>
                                </View>

                                <View className="flex-1">
                                    <TextInput
                                        value={settings?.teamBName}
                                        onChangeText={(t) => updateSettings({ teamBName: t })}
                                        placeholder="Takım B"
                                        placeholderTextColor="#94a3b8"
                                        className="bg-slate-50 border border-slate-800 rounded-2xl px-3 py-3 text-slate-800 font-extrabold text-center"
                                        maxLength={15}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className="px-8 pb-10">
                        <TouchableOpacity
                            className="bg-fuchsia-700 py-6 rounded-3xl shadow-2xl shadow-fuchsia-300 flex-row justify-center items-center active:scale-95 mb-4"
                            onPress={handleStart}
                        >
                            <Ionicons name="play" size={24} color="white" />
                            <Text className="text-white text-2xl font-black uppercase italic tracking-widest ml-3">
                                BAŞLA!
                            </Text>
                        </TouchableOpacity>

                        {/* YENİ EKLENEN MAĞAZA BUTONU */}
                        <TouchableOpacity
                            className="bg-amber-400 py-5 rounded-3xl border border-amber-500 flex-row justify-center items-center active:scale-95 mb-4 shadow-lg shadow-amber-200"
                            onPress={() => navigation.navigate("Store")}
                        >
                            <Ionicons name="cart" size={24} color="white" />
                            <Text className="text-white text-xl font-black uppercase tracking-widest ml-3">
                                MAĞAZA & TEMALAR
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-white/80 py-5 rounded-3xl border border-slate-800 flex-row justify-center items-center active:bg-slate-100"
                            onPress={() => navigation.navigate("Settings")}
                        >
                            <Ionicons name="settings-sharp" size={20} color="#64748b" />
                            <Text className="text-slate-600 text-lg font-bold uppercase tracking-widest ml-3">
                                AYARLAR
                            </Text>
                        </TouchableOpacity>

                        <Text className="text-center text-slate-400 text-[10px] mt-6 font-bold uppercase tracking-widest">
                            v1.2.0
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}