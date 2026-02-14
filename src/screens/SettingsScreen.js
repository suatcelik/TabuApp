import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Switch,
    StatusBar,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import useGameStore from "../store/useGameStore";

export default function SettingsScreen({ navigation }) {
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const loadSettings = useGameStore((s) => s.loadSettings);

    // ✅ Input UX: yazarken string tut (boş yazabilsin)
    const [durationText, setDurationText] = useState(String(settings?.duration ?? 60));
    const [maxPassText, setMaxPassText] = useState(String(settings?.maxPass ?? 3));

    // ✅ YENİ: takım başına tur sayısı
    const [roundsPerTeamText, setRoundsPerTeamText] = useState(
        String(settings?.roundsPerTeam ?? 4)
    );

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

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
        // Blur tetiklenmemiş olabilir diye son kez sanitize edelim:
        sanitizeAndCommit("duration", durationText, 15, 300, setDurationText);
        sanitizeAndCommit("maxPass", maxPassText, 0, 30, setMaxPassText);

        // ✅ YENİ
        sanitizeAndCommit("roundsPerTeam", roundsPerTeamText, 1, 30, setRoundsPerTeamText);

        navigation.goBack();
    };

    const updateField = (field, value) => {
        updateSettings({ [field]: value });
    };

    const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

    // Yazarken sadece rakamları al, store'a anında yazma (UX)
    const handleNumberTyping = (setter) => (text) => {
        const val = text.replace(/[^0-9]/g, "");
        setter(val);
    };

    // Blur veya kaydet anında store'a yaz (min/max clamp)
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

            {/* Üst Bar */}
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
                        <View className="gap-4">
                            <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-2">
                                Takım İsimleri
                            </Text>

                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <Text className="text-slate-500 font-bold mb-2">Takım A</Text>
                                <TextInput
                                    value={settings?.teamAName ?? "Takım A"}
                                    onChangeText={(t) => updateField("teamAName", t)}
                                    placeholder="Takım A"
                                    placeholderTextColor="#94a3b8"
                                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                    maxLength={20}
                                    autoCapitalize="words"
                                />
                            </View>

                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
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

                        {/* Tur Süresi Seçimi */}
                        <View className="gap-4">
                            <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-2">
                                Tur Süresi (Saniye)
                            </Text>
                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <TextInput
                                    value={durationText}
                                    onChangeText={handleNumberTyping(setDurationText)}
                                    onBlur={() =>
                                        sanitizeAndCommit("duration", durationText, 15, 300, setDurationText)
                                    }
                                    keyboardType="numeric"
                                    placeholder="Örn: 60"
                                    placeholderTextColor="#94a3b8"
                                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                    maxLength={3}
                                />
                                <Text className="text-slate-400 text-xs mt-2">
                                    Önerilen: 60-90 saniye (Min 15, Max 300)
                                </Text>
                            </View>
                        </View>

                        {/* ✅ YENİ: Tur Sayısı */}
                        <View className="gap-4">
                            <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-2">
                                Tur Sayısı (Takım Başına)
                            </Text>
                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <TextInput
                                    value={roundsPerTeamText}
                                    onChangeText={handleNumberTyping(setRoundsPerTeamText)}
                                    onBlur={() =>
                                        sanitizeAndCommit(
                                            "roundsPerTeam",
                                            roundsPerTeamText,
                                            1,
                                            30,
                                            setRoundsPerTeamText
                                        )
                                    }
                                    keyboardType="numeric"
                                    placeholder="Örn: 4"
                                    placeholderTextColor="#94a3b8"
                                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                    maxLength={2}
                                />
                                <Text className="text-slate-400 text-xs mt-2">
                                    Toplam tur: 2 × bu değer (Min 1, Max 30)
                                </Text>
                            </View>
                        </View>

                        {/* Pas Hakkı Seçimi */}
                        <View className="gap-4">
                            <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-2">
                                Pas Hakkı
                            </Text>
                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <TextInput
                                    value={maxPassText}
                                    onChangeText={handleNumberTyping(setMaxPassText)}
                                    onBlur={() => sanitizeAndCommit("maxPass", maxPassText, 0, 30, setMaxPassText)}
                                    keyboardType="numeric"
                                    placeholder="Örn: 3"
                                    placeholderTextColor="#94a3b8"
                                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                    maxLength={2}
                                />
                                <Text className="text-slate-400 text-xs mt-2">Önerilen: 3-5 (Max 30)</Text>
                            </View>
                        </View>

                        {/* Titreşim Kontrolü */}
                        {/* ... senin devam eden titreşim kısmın burada aynı kalabilir ... */}
                    </View>
                </ScrollView>

                {/* Kaydet Butonu */}
                <View className="p-6 bg-slate-50">
                    <TouchableOpacity
                        className="bg-indigo-600 py-6 rounded-3xl shadow-xl active:scale-95"
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
