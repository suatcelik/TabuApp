import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useGameStore from "../store/useGameStore";

export default function SettingsScreen({ navigation }) {
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);

    // Input state'leri
    const [durationText, setDurationText] = useState(String(settings?.duration ?? 60));
    const [maxPassText, setMaxPassText] = useState(String(settings?.maxPass ?? 3));
    const [roundsPerTeamText, setRoundsPerTeamText] = useState(
        String(settings?.roundsPerTeam ?? 4)
    );

    // Store değişirse inputları senkronla
    useEffect(() => {
        setDurationText(String(settings?.duration ?? 60));
    }, [settings?.duration]);

    useEffect(() => {
        setMaxPassText(String(settings?.maxPass ?? 3));
    }, [settings?.maxPass]);

    useEffect(() => {
        setRoundsPerTeamText(String(settings?.roundsPerTeam ?? 4));
    }, [settings?.roundsPerTeam]);

    const handleSave = () => {
        sanitizeAndCommit("duration", durationText, 15, 300, setDurationText);
        sanitizeAndCommit("maxPass", maxPassText, 0, 30, setMaxPassText);
        sanitizeAndCommit("roundsPerTeam", roundsPerTeamText, 1, 30, setRoundsPerTeamText);
        navigation.goBack();
    };

    const updateField = (field, value) => {
        updateSettings({ [field]: value });
    };

    const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

    const handleNumberTyping = (setter) => (text) => {
        const val = text.replace(/[^0-9]/g, "");
        setter(val);
    };

    const sanitizeAndCommit = (field, text, min, max, setter) => {
        const cleaned = String(text ?? "").replace(/[^0-9]/g, "");
        const parsed = cleaned === "" ? min : parseInt(cleaned, 10);
        const clamped = clamp(Number.isFinite(parsed) ? parsed : min, min, max);

        setter(String(clamped));
        updateField(field, clamped);
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />

            <View className="flex-row items-center px-6 py-4 bg-white border-b border-slate-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                    <Ionicons name="arrow-back" size={28} color="#4f46e5" />
                </TouchableOpacity>
                <Text className="ml-4 text-2xl font-black text-slate-800 uppercase tracking-tighter">
                    Oyun Ayarları
                </Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
                    <View className="p-6 space-y-8">
                        {/* Takım İsimleri */}
                        <View className="gap-4 mb-6">
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8">Takım İsimleri</Text>
                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <Text className="text-slate-500 font-bold mb-2">Takım A</Text>
                                <TextInput
                                    value={settings?.teamAName ?? "Takım A"}
                                    onChangeText={(t) => updateField("teamAName", t)}
                                    placeholder="Takım A"
                                    placeholderTextColor="#94a3b8"
                                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold mb-6"
                                    maxLength={20}
                                    autoCapitalize="words"
                                />
                                <Text className="text-slate-500 font-bold mb-2">Takım B</Text>
                                <TextInput
                                    value={settings?.teamBName ?? "Takım B"}
                                    onChangeText={(t) => updateField("teamBName", t)}
                                    placeholder="Takım B"
                                    placeholderTextColor="#94a3b8"
                                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                    maxLength={20}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Diğer Ayarlar (Süre, Tur, Pas) */}
                        <View className="gap-4 mb-6">
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8">Tur Süresi (Saniye)</Text>
                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <TextInput
                                    value={durationText}
                                    onChangeText={handleNumberTyping(setDurationText)}
                                    onBlur={() => sanitizeAndCommit("duration", durationText, 15, 300, setDurationText)}
                                    keyboardType="numeric"
                                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                    maxLength={3}
                                />
                            </View>
                        </View>

                        <View className="gap-4 mb-6">
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8">Tur Sayısı (Takım Başına)</Text>
                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <TextInput
                                    value={roundsPerTeamText}
                                    onChangeText={handleNumberTyping(setRoundsPerTeamText)}
                                    onBlur={() => sanitizeAndCommit("roundsPerTeam", roundsPerTeamText, 1, 30, setRoundsPerTeamText)}
                                    keyboardType="numeric"
                                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                    maxLength={2}
                                />
                            </View>
                        </View>

                        <View className="gap-4 mb-6">
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8">Pas Hakkı</Text>
                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <TextInput
                                    value={maxPassText}
                                    onChangeText={handleNumberTyping(setMaxPassText)}
                                    onBlur={() => sanitizeAndCommit("maxPass", maxPassText, 0, 30, setMaxPassText)}
                                    keyboardType="numeric"
                                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                    maxLength={2}
                                />
                            </View>
                        </View>

                        {/* YASAL */}
                        <View className="gap-4 mt-6">
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8">Yasal</Text>
                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <TouchableOpacity
                                    onPress={() => navigation.navigate("PrivacyPolicy")}
                                    className="flex-row items-center justify-between py-3"
                                >
                                    <View className="flex-row items-center">
                                        <Ionicons name="shield-checkmark" size={22} color="#4f46e5" />
                                        <Text className="ml-3 text-slate-800 font-extrabold">Gizlilik Politikası</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <View className="p-6 bg-slate-50">
                    <TouchableOpacity
                        className="bg-fuchsia-700 py-6 rounded-3xl shadow-xl active:scale-95"
                        onPress={handleSave}
                    >
                        <Text className="text-white text-center font-black text-xl uppercase tracking-widest">
                            Değişiklikleri Uygula
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}