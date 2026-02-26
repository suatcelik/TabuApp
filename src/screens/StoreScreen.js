import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useGameStore from "../store/useGameStore";
import { buyProduct, restorePurchases } from "../services/iapService";

const BUNDLE_THEMES = [
    { id: 'default', name: 'Klasik Parti', icon: 'mic', color: 'text-fuchsia-500', bg: 'bg-fuchsia-100' },
    { id: 'neon_shhh', name: 'Neon Shhh', icon: 'volume-mute', color: 'text-cyan-400', bg: 'bg-slate-800' },
    { id: 'retro_buzz', name: 'Retro Buzz', icon: 'hourglass', color: 'text-amber-500', bg: 'bg-amber-100' },
    { id: 'golden_victory', name: 'Golden Victory', icon: 'trophy', color: 'text-yellow-600', bg: 'bg-zinc-800' },
    { id: 'pixel_guesser', name: 'Pixel Guesser', icon: 'game-controller', color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { id: 'graffiti_shhh', name: 'Graffiti Shhh', icon: 'brush', color: 'text-rose-500', bg: 'bg-rose-100' },
];

export default function StoreScreen({ navigation }) {
    const { settings, isThemeBundlePurchased, isPremium, updateSettings } = useGameStore();
    const [loading, setLoading] = useState(false);

    const handleBuy = async (productId) => {
        setLoading(true);
        try {
            await buyProduct(productId);
        } catch (error) {
            Alert.alert("Hata", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            await restorePurchases();
            Alert.alert("Başarılı", "Önceki satın alımlarınız geri yüklendi.");
        } catch (error) {
            Alert.alert("Hata", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white shadow-sm z-10">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                    <Ionicons name="arrow-back" size={28} color="#334155" />
                </TouchableOpacity>
                <Text className="text-2xl font-black text-slate-800 ml-2 uppercase tracking-widest">Mağaza</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

                {/* YENİ: Satın Alımları Geri Yükle Butonu (Üst Kısım) */}
                <TouchableOpacity
                    className="mb-6 flex-row items-center justify-center bg-white border border-slate-200 py-3 rounded-2xl shadow-sm active:bg-slate-50"
                    onPress={handleRestore}
                    disabled={loading}
                >
                    <Ionicons name="refresh-circle" size={22} color="#6366f1" />
                    <Text className="ml-2 text-indigo-600 font-bold tracking-tight">Eski Satın Alımları Geri Yükle</Text>
                </TouchableOpacity>

                {/* 1. Kısım: Reklam Kaldırma */}
                {!isPremium && (
                    <TouchableOpacity
                        className="bg-amber-400 p-6 rounded-3xl shadow-xl shadow-amber-200 mb-6 flex-row items-center justify-between"
                        onPress={() => handleBuy("tabu_reklamsiz")}
                        disabled={loading}
                    >
                        <View className="flex-1 pr-4">
                            <Text className="text-white text-xl font-black uppercase tracking-widest mb-1">Reklamsız Oyna</Text>
                            <Text className="text-amber-100 font-bold text-xs">Oyununu hiç bölünmeden oyna.</Text>
                        </View>
                        <View className="bg-white px-4 py-2 rounded-xl">
                            <Text className="text-amber-500 font-black">SATIN AL</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* 2. Kısım: Tema Paketi Satın Alma Banner'ı */}
                {!isThemeBundlePurchased && (
                    <View className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-200 mb-8 items-center">
                        <Ionicons name="color-palette" size={40} color="white" className="mb-2" />
                        <Text className="text-white text-2xl font-black uppercase tracking-widest text-center mb-2">
                            Kozmetik Paketi
                        </Text>
                        <Text className="text-indigo-200 text-center font-bold mb-4 text-xs px-2">
                            Aşağıdaki 5 eşsiz özel arka plan tasarımını ve oyun içi ikon setini tek seferde aç!
                        </Text>
                        <TouchableOpacity
                            className="bg-white px-8 py-3 rounded-2xl active:scale-95 w-full items-center"
                            onPress={() => handleBuy("tabu_tema_paketi_1")}
                            disabled={loading}
                        >
                            <Text className="text-indigo-600 font-black text-lg uppercase tracking-wider">PAKETİ SATIN AL</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Tema Listesi */}
                <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Tasarımlar</Text>
                <View className="gap-4">
                    {BUNDLE_THEMES.map((theme) => {
                        const isUnlocked = theme.id === 'default' || isThemeBundlePurchased;
                        const isSelected = settings.selectedTheme === theme.id;

                        return (
                            <TouchableOpacity
                                key={theme.id}
                                className={`p-4 rounded-3xl border ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white'} shadow-sm flex-row items-center justify-between opacity-${isUnlocked ? '100' : '60'}`}
                                onPress={() => {
                                    if (isUnlocked) {
                                        updateSettings({ selectedTheme: theme.id });
                                    } else {
                                        Alert.alert("Kilitli", "Bu tasarımı kullanmak için yukarıdan Kozmetik Paketini satın almalısınız.");
                                    }
                                }}
                                disabled={loading}
                            >
                                <View className="flex-row items-center">
                                    <View className={`w-12 h-12 rounded-full ${theme.bg} items-center justify-center`}>
                                        <Ionicons name={theme.icon} size={24} className={theme.color} />
                                    </View>
                                    <View className="ml-4">
                                        <Text className="text-slate-800 font-black text-lg">{theme.name}</Text>
                                        {!isUnlocked && <Text className="text-rose-500 font-bold text-xs">Kilitli</Text>}
                                    </View>
                                </View>
                                <View>
                                    {isSelected ? <Ionicons name="checkmark-circle" size={28} color="#6366f1" /> :
                                        !isUnlocked ? <Ionicons name="lock-closed" size={24} color="#cbd5e1" /> : null}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

            </ScrollView>

            {/* Yükleniyor Overlay */}
            {loading && (
                <View className="absolute inset-0 bg-white/80 justify-center items-center z-50">
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text className="text-indigo-600 font-black mt-4 uppercase">İşleniyor...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}