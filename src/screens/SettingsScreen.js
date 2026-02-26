import React from "react";
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

    // Seçenek Grupları
    const durationOptions = [5, 60, 90, 120];
    const maxPassOptions = [3, 4, 5];
    const roundsOptions = [4, 6, 8, 10];

    const updateField = (field, value) => {
        updateSettings({ [field]: value });
    };

    // Seçenek Butonu Bileşeni
    const SelectionGroup = ({ label, options, currentVal, field, activeColor }) => (
        <View className="gap-3 mb-8">
            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-4">
                {label}
            </Text>
            <View className="flex-row gap-3">
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt}
                        onPress={() => updateField(field, opt)}
                        className={`flex-1 py-4 rounded-2xl border-2 items-center justify-center shadow-sm 
                            ${currentVal === opt
                                ? `${activeColor} border-slate-800`
                                : "bg-white border-slate-200"}`}
                    >
                        <Text className={`text-lg font-black ${currentVal === opt ? "text-white" : "text-slate-600"}`}>
                            {opt}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 active:opacity-50">
                    <Ionicons name="arrow-back" size={28} color="#4f46e5" />
                </TouchableOpacity>
                <Text className="ml-4 text-2xl font-black text-slate-800 uppercase tracking-tighter">
                    Ayarlar
                </Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>

                    {/* Takım İsimleri Kartı */}
                    <View className="bg-blue-800 p-6 rounded-[35px] border-2 border-slate-800 shadow-lg mb-8">
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="people" size={20} color="white" />
                            <Text className="text-white font-black ml-2 uppercase tracking-widest">Takımlar</Text>
                        </View>

                        <View className="space-y-4">
                            <View>
                                <Text className="text-blue-200 text-xs font-bold mb-2 ml-1">1. TAKIM</Text>
                                <TextInput
                                    value={settings?.teamAName ?? "Takım A"}
                                    onChangeText={(t) => updateField("teamAName", t)}
                                    placeholder="Takım A"
                                    placeholderTextColor="#94a3b8"
                                    className="bg-white border-2 border-slate-800 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                    maxLength={15}
                                />
                            </View>

                            <View className="mt-4">
                                <Text className="text-blue-200 text-xs font-bold mb-2 ml-1">2. TAKIM</Text>
                                <TextInput
                                    value={settings?.teamBName ?? "Takım B"}
                                    onChangeText={(t) => updateField("teamBName", t)}
                                    placeholder="Takım B"
                                    placeholderTextColor="#94a3b8"
                                    className="bg-white border-2 border-slate-800 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                    maxLength={15}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Seçmeli Ayarlar */}
                    <SelectionGroup
                        label="Tur Süresi (Saniye)"
                        options={durationOptions}
                        currentVal={settings?.duration}
                        field="duration"
                        activeColor="bg-orange-500"
                    />

                    <SelectionGroup
                        label="Toplam Tur Sayısı"
                        options={roundsOptions}
                        currentVal={settings?.roundsPerTeam}
                        field="roundsPerTeam"
                        activeColor="bg-emerald-500"
                    />

                    <SelectionGroup
                        label="Pas Hakkı"
                        options={maxPassOptions}
                        currentVal={settings?.maxPass}
                        field="maxPass"
                        activeColor="bg-fuchsia-600"
                    />

                    {/* Yasal Bilgiler */}
                    <View className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mt-4">
                        <TouchableOpacity
                            onPress={() => navigation.navigate("PrivacyPolicy")}
                            className="flex-row items-center justify-between"
                        >
                            <View className="flex-row items-center">
                                <View className="bg-indigo-100 p-2 rounded-xl">
                                    <Ionicons name="shield-checkmark" size={20} color="#4f46e5" />
                                </View>
                                <Text className="ml-3 text-slate-700 font-bold">Gizlilik Politikası</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* Kaydet Butonu */}
                <View className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <TouchableOpacity
                        className="bg-slate-900 py-5 rounded-2xl shadow-xl active:scale-95 flex-row justify-center items-center"
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="white" className="mr-2" />
                        <Text className="text-white text-center font-black text-lg uppercase tracking-widest ml-2">
                            Ayarları Kaydet
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}