import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    Image,
    InteractionManager,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useGameStore from "../store/useGameStore";
import Svg, { Path, Text as SvgText, TextPath } from "react-native-svg";

// ✅ DÜZELTME: IAP servisi import edildi
import { initIAP } from "../services/iapService";

export default function HomeScreen({ navigation }) {
    // Store'dan verileri ve güncelleme fonksiyonunu alıyoruz
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const resetGame = useGameStore((s) => s.resetGame);

    const [showCurvedTitle, setShowCurvedTitle] = useState(false);

    useEffect(() => {
        // ✅ DÜZELTME: Uygulama açılışında market dinleyicilerini başlat (Yarım kalan satın alımları yakalar)
        initIAP().catch((e) => console.log("Açılış IAP Başlatma Hatası:", e));

        const task = InteractionManager.runAfterInteractions(() => {
            setShowCurvedTitle(true);
        });
        return () => task?.cancel?.();
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
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Üst Alan */}
                    <View className="flex-1 justify-center items-center px-8 py-10">
                        {/* Glow / Hero arka plan */}
                        <View className="absolute -top-24 w-[420px] h-[420px] rounded-full bg-indigo-300/40" />
                        <View className="absolute top-24 w-[280px] h-[280px] rounded-full bg-indigo-400/30" />

                        {/* Logo */}
                        <View className="items-center justify-center pt-20">
                            <Image
                                source={require("../../assets/logo.png")}
                                className="w-80 h-80"
                                resizeMode="contain"
                                fadeDuration={0}
                            />
                        </View>

                        {/* Başlık */}
                        <View className="items-center">
                            {showCurvedTitle ? (
                                <Svg width={300} height={95}>
                                    <Path id="curve" d="M 20 85 Q 150 5 280 85" fill="transparent" />
                                    <SvgText fill="#0f172a" fontSize="58" fontWeight="900" textAnchor="middle">
                                        <TextPath href="#curve" startOffset="50%">
                                            TABU
                                        </TextPath>
                                    </SvgText>
                                </Svg>
                            ) : (
                                <Text className="text-slate-900 text-6xl font-black">TABU</Text>
                            )}
                            <Text className="text-6xl font-black text-fuchsia-700 -mt-14">GO</Text>
                        </View>

                        {/* ✅ TAKIM İSİMLERİ ALANI */}
                        <View className="w-full mt-10 bg-slate-50 p-6 rounded-[35px] border border-slate-100 shadow-sm">
                            <Text className="text-slate-400 text-center font-bold uppercase tracking-widest text-[10px] mb-4">
                                Takımları Düzenle
                            </Text>

                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <TextInput
                                        value={settings?.teamAName}
                                        onChangeText={(t) => updateSettings({ teamAName: t })}
                                        placeholder="Takım A"
                                        placeholderTextColor="#94a3b8"
                                        className="bg-white border border-slate-200 rounded-2xl px-3 py-3 text-slate-800 font-extrabold text-center"
                                        maxLength={15}
                                    />
                                </View>

                                <View className="px-4">
                                    <Text className="font-black text-fuchsia-700 text-lg italic">VS</Text>
                                </View>

                                <View className="flex-1">
                                    <TextInput
                                        value={settings?.teamBName}
                                        onChangeText={(t) => updateSettings({ teamBName: t })}
                                        placeholder="Takım B"
                                        placeholderTextColor="#94a3b8"
                                        className="bg-white border border-slate-200 rounded-2xl px-3 py-3 text-slate-800 font-extrabold text-center"
                                        maxLength={15}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Alt Alan (Butonlar) */}
                    <View className="px-8 pb-10 space-y-4">
                        <TouchableOpacity
                            className="bg-fuchsia-700 py-6 rounded-3xl shadow-2xl shadow-indigo-300 flex-row justify-center items-center active:scale-95"
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
                            v1.1.3 - Tabu Go
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}