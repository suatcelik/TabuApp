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
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useGameStore from "../store/useGameStore";

// IAP
import {
    buyRemoveAds,
    restoreRemoveAds,
    getLocalRemoveAds,
    getProducts,
} from "../services/iapService";

export default function SettingsScreen({ navigation }) {
    // ✅ DÜZELTME: loadSettings kaldırıldı. Sadece settings ve updateSettings alındı.
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);

    // Input state'leri
    const [durationText, setDurationText] = useState(String(settings?.duration ?? 60));
    const [maxPassText, setMaxPassText] = useState(String(settings?.maxPass ?? 3));
    const [roundsPerTeamText, setRoundsPerTeamText] = useState(
        String(settings?.roundsPerTeam ?? 4)
    );

    // Remove Ads UI state
    const [removeAdsEnabled, setRemoveAdsEnabled] = useState(false);
    const [removeAdsPriceText, setRemoveAdsPriceText] = useState("");
    const [iapBusy, setIapBusy] = useState(false);

    // ✅ DÜZELTME: useEffect(() => { loadSettings() }, []) KODU SİLİNDİ.
    // Zustand Persist sayesinde ayarlar zaten otomatik yüklü geliyor.

    // Store değişirse inputları senkronla (örn: başka yerden değişirse)
    useEffect(() => {
        setDurationText(String(settings?.duration ?? 60));
    }, [settings?.duration]);

    useEffect(() => {
        setMaxPassText(String(settings?.maxPass ?? 3));
    }, [settings?.maxPass]);

    useEffect(() => {
        setRoundsPerTeamText(String(settings?.roundsPerTeam ?? 4));
    }, [settings?.roundsPerTeam]);

    // Remove Ads: local durum + fiyat çek
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const local = await getLocalRemoveAds();
                if (!alive) return;
                setRemoveAdsEnabled(!!local);
            } catch { }

            try {
                const products = await getProducts();
                const p = products?.find((x) => x.productId === "remove_ads");
                const price = p?.localizedPrice || p?.price || "";
                if (!alive) return;
                setRemoveAdsPriceText(price ? ` (${price})` : "");
            } catch {
                // fiyat çekilemezse boş bırak
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    const handleSave = () => {
        // Blur tetiklenmemiş olabilir diye son kez sanitize edelim:
        sanitizeAndCommit("duration", durationText, 15, 300, setDurationText);
        sanitizeAndCommit("maxPass", maxPassText, 0, 30, setMaxPassText);
        sanitizeAndCommit("roundsPerTeam", roundsPerTeamText, 1, 30, setRoundsPerTeamText);

        navigation.goBack();
    };

    const updateField = (field, value) => {
        updateSettings({ [field]: value });
    };

    const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

    // Yazarken sadece rakamları al
    const handleNumberTyping = (setter) => (text) => {
        const val = text.replace(/[^0-9]/g, "");
        setter(val);
    };

    // Blur veya kaydet anında store'a yaz
    const sanitizeAndCommit = (field, text, min, max, setter) => {
        const cleaned = String(text ?? "").replace(/[^0-9]/g, "");
        const parsed = cleaned === "" ? min : parseInt(cleaned, 10);
        const clamped = clamp(Number.isFinite(parsed) ? parsed : min, min, max);

        setter(String(clamped));
        updateField(field, clamped);
    };

    // IAP handlers
    const onBuyRemoveAds = async () => {
        if (iapBusy || removeAdsEnabled) return;

        setIapBusy(true);
        try {
            const ok = await buyRemoveAds();
            if (!ok) {
                Alert.alert("Satın alma başlatılamadı", "Lütfen tekrar deneyin.");
                return;
            }

            const local = await getLocalRemoveAds();
            setRemoveAdsEnabled(!!local);

            if (local) {
                Alert.alert("Başarılı ✅", "Reklamlar kaldırıldı.");
            } else {
                Alert.alert(
                    "Bilgi",
                    "Satın alma işlemi tamamlanınca reklamlar otomatik kapanır. Eğer kapanmazsa 'Geri Yükle' yapabilirsin."
                );
            }
        } catch (e) {
            Alert.alert("Hata", e?.message || "Satın alma sırasında bir hata oluştu.");
        } finally {
            setIapBusy(false);
        }
    };

    const onRestoreRemoveAds = async () => {
        if (iapBusy) return;

        setIapBusy(true);
        try {
            const owns = await restoreRemoveAds();
            setRemoveAdsEnabled(!!owns);

            Alert.alert(
                owns ? "Geri Yüklendi ✅" : "Bulunamadı",
                owns
                    ? "Reklamlar kaldırıldı."
                    : "Bu hesapta 'Reklamları Kaldır' satın alımı bulunamadı."
            );
        } catch (e) {
            Alert.alert("Hata", e?.message || "Geri yükleme sırasında bir hata oluştu.");
        } finally {
            setIapBusy(false);
        }
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
                        <View className="gap-4 mb-6">
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8 ">
                                Takım İsimleri
                            </Text>

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

                        {/* Tur Süresi Seçimi */}
                        <View className="gap-4 mb-6">
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8">
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

                        {/* Tur Sayısı */}
                        <View className="gap-4 mb-6">
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8">
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
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8">
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

                        {/* PREMIUM / REMOVE ADS */}
                        <View className="gap-4 mt-6">
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8">
                                Premium
                            </Text>

                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <Ionicons name="diamond" size={22} color="#f59e0b" />
                                        <Text className="ml-3 text-slate-800 font-extrabold">
                                            Reklamları Kaldır
                                        </Text>
                                    </View>

                                    <View className="flex-row items-center">
                                        <Text className={`mr-2 font-black ${removeAdsEnabled ? "text-emerald-600" : "text-slate-400"}`}>
                                            {removeAdsEnabled ? "AKTİF" : "PASİF"}
                                        </Text>
                                        {iapBusy ? <ActivityIndicator /> : null}
                                    </View>
                                </View>

                                <Text className="text-slate-400 text-xs mt-2 ml-1">
                                    Satın alınca tüm interstitial reklamlar kapanır.{removeAdsPriceText}
                                </Text>

                                <View className="flex-row gap-3 mt-4">
                                    <TouchableOpacity
                                        onPress={onBuyRemoveAds}
                                        disabled={iapBusy || removeAdsEnabled}
                                        activeOpacity={0.9}
                                        className={`flex-1 py-4 rounded-2xl items-center justify-center ${iapBusy || removeAdsEnabled ? "bg-slate-200" : "bg-indigo-600"
                                            }`}
                                    >
                                        <Text className={`font-black uppercase tracking-widest ${iapBusy || removeAdsEnabled ? "text-slate-500" : "text-white"
                                            }`}>
                                            {removeAdsEnabled ? "Satın Alındı" : `Satın Al${removeAdsPriceText}`}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={onRestoreRemoveAds}
                                        disabled={iapBusy}
                                        activeOpacity={0.9}
                                        className={`py-4 px-4 rounded-2xl items-center justify-center ${iapBusy ? "bg-slate-200" : "bg-slate-800"
                                            }`}
                                    >
                                        <Ionicons name="refresh" size={20} color={iapBusy ? "#64748b" : "white"} />
                                    </TouchableOpacity>
                                </View>

                                <Text className="text-slate-400 text-[11px] mt-2 ml-1">
                                    Not: Hesap değiştirdiysen “Geri Yükle” ile tekrar aktif edebilirsin.
                                </Text>
                            </View>
                        </View>

                        {/* YASAL */}
                        <View className="gap-4 mt-6">
                            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs ml-8">
                                Yasal
                            </Text>

                            <View className="bg-white p-5 rounded-[35px] border border-slate-100 shadow-sm">
                                <TouchableOpacity
                                    onPress={() => navigation.navigate("PrivacyPolicy")}
                                    className="flex-row items-center justify-between py-3"
                                    activeOpacity={0.8}
                                >
                                    <View className="flex-row items-center">
                                        <Ionicons name="shield-checkmark" size={22} color="#4f46e5" />
                                        <Text className="ml-3 text-slate-800 font-extrabold">
                                            Gizlilik Politikası
                                        </Text>
                                    </View>

                                    <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
                                </TouchableOpacity>

                                <Text className="text-slate-400 text-xs mt-2 ml-1">
                                    Verilerin kullanımı, reklamlar ve satın alma hakkında bilgi.
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Kaydet Butonu */}
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