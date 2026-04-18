import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StatusBar,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
} from "react-native-reanimated";
import useGameStore from "../store/useGameStore";
import {
    buyProduct,
    restorePurchases,
    getProducts,
} from "../services/iapService";
import CustomAlert from "../components/CustomAlert";
import AppButton from "../components/AppButton";
import { hapticLight, hapticSelection, hapticWarning } from "../utils/haptics";

const BUNDLE_THEMES = [
    { id: "default", name: "Klasik Parti", icon: "mic", color: "#a21caf", bg: "bg-fuchsia-100" },
    { id: "neon_shhh", name: "Neon Shhh", icon: "volume-mute", color: "#22d3ee", bg: "bg-slate-800" },
    { id: "retro_buzz", name: "Retro Buzz", icon: "hourglass", color: "#f59e0b", bg: "bg-amber-100" },
    { id: "golden_victory", name: "Golden Victory", icon: "trophy", color: "#eab308", bg: "bg-zinc-800" },
    { id: "pixel_guesser", name: "Pixel Guesser", icon: "game-controller", color: "#10b981", bg: "bg-emerald-100" },
    { id: "graffiti_shhh", name: "Graffiti Shhh", icon: "brush", color: "#e11d48", bg: "bg-rose-100" },
];

function StaggeredCard({ delay = 0, children, style }) {
    const translateY = useSharedValue(24);
    const opacity = useSharedValue(0);

    useEffect(() => {
        translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 160 }));
        opacity.value = withDelay(delay, withTiming(1, { duration: 420 }));
    }, []);

    const s = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return <Animated.View style={[s, style]}>{children}</Animated.View>;
}

function ThemeRow({ theme, isUnlocked, isSelected, onPress, disabled }) {
    const scale = useSharedValue(1);

    const s = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={s}>
            <Pressable
                onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 260 }); }}
                onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
                onPress={onPress}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected: !!isSelected, disabled: !isUnlocked }}
                android_ripple={{ color: "#00000010" }}
                className={`p-4 rounded-3xl border ${isSelected ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-white"} shadow-sm flex-row items-center justify-between ${isUnlocked ? "" : "opacity-60"}`}
            >
                <View className="flex-row items-center">
                    <View className={`w-12 h-12 rounded-full ${theme.bg} items-center justify-center`}>
                        <Ionicons name={theme.icon} size={22} color={theme.color} />
                    </View>
                    <View className="ml-4">
                        <Text className="text-slate-800 font-black text-lg">{theme.name}</Text>
                        {!isUnlocked && <Text className="text-rose-500 font-black text-xs uppercase tracking-widest">Kilitli</Text>}
                        {isSelected && <Text className="text-indigo-500 font-black text-xs uppercase tracking-widest">Seçili</Text>}
                    </View>
                </View>
                <View>
                    {isSelected ? (
                        <Ionicons name="checkmark-circle" size={28} color="#6366f1" />
                    ) : !isUnlocked ? (
                        <Ionicons name="lock-closed" size={22} color="#cbd5e1" />
                    ) : null}
                </View>
            </Pressable>
        </Animated.View>
    );
}

export default function StoreScreen({ navigation }) {
    const { settings, isThemeBundlePurchased, isExtraWordsPurchased, isPremium, updateSettings } = useGameStore();
    const [loading, setLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState(null);
    const [prices, setPrices] = useState({});

    useEffect(() => {
        getProducts()
            .then((products) => {
                const map = {};
                (products || []).forEach((p) => {
                    map[p.productId] = p.localizedPrice || p.price || "";
                });
                setPrices(map);
            })
            .catch(() => { });
    }, []);

    const handleBuy = async (productId) => {
        setLoading(true);
        try {
            await buyProduct(productId);
        } catch (error) {
            setAlertConfig({ title: "Hata", message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            await restorePurchases();
            setAlertConfig({
                title: "Başarılı",
                message: "Önceki satın alımlarınız geri yüklendi.",
            });
        } catch (error) {
            setAlertConfig({ title: "Hata", message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />

            <View className="flex-row items-center px-4 py-3 bg-white shadow-sm z-10">
                <Pressable
                    onPress={() => {
                        hapticLight();
                        navigation.goBack();
                    }}
                    hitSlop={12}
                    accessibilityLabel="Geri"
                    accessibilityRole="button"
                    className="p-2 -ml-2 active:opacity-60"
                >
                    <Ionicons name="arrow-back" size={26} color="#0f172a" />
                </Pressable>
                <Text className="text-2xl font-black text-slate-800 ml-2 uppercase tracking-widest">
                    Mağaza
                </Text>
                {isPremium && (
                    <View className="ml-auto bg-amber-400 px-3 py-1 rounded-full flex-row items-center">
                        <Ionicons name="star" size={14} color="white" />
                        <Text className="text-white font-black text-xs ml-1 uppercase tracking-widest">Premium</Text>
                    </View>
                )}
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                <StaggeredCard delay={0}>
                    <Pressable
                        className="mb-5 flex-row items-center justify-center bg-white border border-slate-200 py-3 rounded-2xl shadow-sm active:opacity-80"
                        onPress={() => {
                            hapticLight();
                            handleRestore();
                        }}
                        disabled={loading}
                        android_ripple={{ color: "#00000010" }}
                    >
                        <Ionicons name="refresh-circle" size={20} color="#6366f1" />
                        <Text className="ml-2 text-indigo-600 font-black tracking-tight">
                            Eski Satın Alımları Geri Yükle
                        </Text>
                    </Pressable>
                </StaggeredCard>

                {!isPremium && (
                    <StaggeredCard delay={80}>
                        <View className="bg-rose-500 p-6 rounded-[28px] shadow-xl mb-5 items-center">
                            <View className="bg-white/20 p-3 rounded-full mb-2">
                                <Ionicons name="ban" size={36} color="white" />
                            </View>
                            <Text className="text-white text-2xl font-black uppercase tracking-widest text-center mb-1">
                                Reklamsız Deneyim
                            </Text>
                            <Text className="text-rose-100 text-center font-bold mb-4 text-xs px-2">
                                Araya giren tüm reklamlardan sonsuza dek kurtul ve oyunun tadını kesintisiz çıkar!
                            </Text>
                            <AppButton
                                label={`REKLAMLARI KALDIR${prices["tabu_reklamsiz_v1"] ? ` — ${prices["tabu_reklamsiz_v1"]}` : ""}`}
                                variant="outline"
                                size="md"
                                glow={false}
                                loading={loading}
                                onPress={() => handleBuy("tabu_reklamsiz_v1")}
                                textClassName="text-rose-600"
                            />
                        </View>
                    </StaggeredCard>
                )}

                {!isExtraWordsPurchased && (
                    <StaggeredCard delay={160}>
                        <View className="bg-emerald-500 p-6 rounded-[28px] shadow-xl mb-5 items-center">
                            <View className="bg-white/20 p-3 rounded-full mb-2">
                                <Ionicons name="library" size={36} color="white" />
                            </View>
                            <Text className="text-white text-2xl font-black uppercase tracking-widest text-center mb-1">
                                Mega Kelime Paketi
                            </Text>
                            <Text className="text-emerald-100 text-center font-bold mb-4 text-xs px-2">
                                Eğlenceyi ikiye katla! Oyuna +1000'den fazla yepyeni, zorlu ve eğlenceli kelime ekle.
                            </Text>
                            <AppButton
                                label={`PAKETİ SATIN AL${prices["tabu_ekstra_kelime_1"] ? ` — ${prices["tabu_ekstra_kelime_1"]}` : ""}`}
                                variant="outline"
                                size="md"
                                glow={false}
                                loading={loading}
                                onPress={() => handleBuy("tabu_ekstra_kelime_1")}
                                textClassName="text-emerald-600"
                            />
                        </View>
                    </StaggeredCard>
                )}

                {!isThemeBundlePurchased && (
                    <StaggeredCard delay={240}>
                        <View className="bg-indigo-600 p-6 rounded-[28px] shadow-xl mb-7 items-center">
                            <View className="bg-white/20 p-3 rounded-full mb-2">
                                <Ionicons name="color-palette" size={36} color="white" />
                            </View>
                            <Text className="text-white text-2xl font-black uppercase tracking-widest text-center mb-1">
                                Kozmetik Paketi
                            </Text>
                            <Text className="text-indigo-200 text-center font-bold mb-4 text-xs px-2">
                                Aşağıdaki 5 eşsiz özel arka plan tasarımını ve oyun içi ikon setini tek seferde aç!
                            </Text>
                            <AppButton
                                label={`PAKETİ SATIN AL${prices["tabu_tema_paketi_1"] ? ` — ${prices["tabu_tema_paketi_1"]}` : ""}`}
                                variant="outline"
                                size="md"
                                glow={false}
                                loading={loading}
                                onPress={() => handleBuy("tabu_tema_paketi_1")}
                                textClassName="text-indigo-600"
                            />
                        </View>
                    </StaggeredCard>
                )}

                <Text className="text-slate-400 font-black uppercase tracking-widest text-xs mb-3 ml-2">
                    Tasarımlar
                </Text>
                <View className="gap-3">
                    {BUNDLE_THEMES.map((theme, i) => {
                        const isUnlocked = theme.id === "default" || isThemeBundlePurchased;
                        const isSelected = settings.selectedTheme === theme.id;

                        return (
                            <StaggeredCard key={theme.id} delay={320 + i * 70}>
                                <ThemeRow
                                    theme={theme}
                                    isUnlocked={isUnlocked}
                                    isSelected={isSelected}
                                    disabled={loading}
                                    onPress={() => {
                                        if (isUnlocked) {
                                            hapticSelection();
                                            updateSettings({ selectedTheme: theme.id });
                                        } else {
                                            hapticWarning();
                                            setAlertConfig({
                                                title: "Kilitli",
                                                message:
                                                    "Bu tasarımı kullanmak için yukarıdan Kozmetik Paketini satın almalısınız.",
                                            });
                                        }
                                    }}
                                />
                            </StaggeredCard>
                        );
                    })}
                </View>
            </ScrollView>

            {loading && (
                <View className="absolute inset-0 bg-white/80 justify-center items-center z-50">
                    <ActivityIndicator size="large" color="#a21caf" />
                    <Text className="text-fuchsia-700 font-black mt-4 uppercase tracking-widest">
                        İşleniyor...
                    </Text>
                </View>
            )}

            <CustomAlert
                visible={!!alertConfig}
                {...alertConfig}
                onClose={() => setAlertConfig(null)}
            />
        </SafeAreaView>
    );
}
