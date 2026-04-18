import React, { useEffect, useRef, useState } from "react";
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
import useTheme from "../hooks/useTheme";
import useTranslation from "../hooks/useTranslation";

const BUNDLE_THEMES = [
    { id: "default", icon: "mic", color: "#a21caf", bg: "bg-fuchsia-100", accentHex: "#a21caf", secondaryHex: "#f59e0b" },
    { id: "neon_shhh", icon: "volume-mute", color: "#22d3ee", bg: "bg-slate-900", accentHex: "#22d3ee", secondaryHex: "#f472b6" },
    { id: "retro_buzz", icon: "hourglass", color: "#f59e0b", bg: "bg-amber-100", accentHex: "#ea580c", secondaryHex: "#facc15" },
    { id: "golden_victory", icon: "trophy", color: "#eab308", bg: "bg-zinc-900", accentHex: "#eab308", secondaryHex: "#f59e0b" },
    { id: "pixel_guesser", icon: "game-controller", color: "#10b981", bg: "bg-emerald-100", accentHex: "#10b981", secondaryHex: "#0ea5e9" },
    { id: "graffiti_shhh", icon: "brush", color: "#e11d48", bg: "bg-rose-100", accentHex: "#e11d48", secondaryHex: "#a21caf" },
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

function ThemePreview({ accentHex, secondaryHex, bgClass }) {
    // Minimalist preview tile showing the theme's "vibe"
    return (
        <View className={`w-16 h-16 rounded-2xl overflow-hidden items-center justify-center ${bgClass}`}>
            <View
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: accentHex,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <View
                    style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: secondaryHex,
                    }}
                />
            </View>
        </View>
    );
}

function ThemeRow({ theme, isUnlocked, isSelected, onPress, disabled, t, isDark }) {
    const scale = useSharedValue(1);

    const s = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const rowBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100";
    const selectedBg = isDark ? "bg-indigo-900/40 border-indigo-500" : "bg-indigo-50 border-indigo-500";
    const textClass = isDark ? "text-slate-100" : "text-slate-800";

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
                className={`p-4 rounded-3xl border shadow-sm flex-row items-center justify-between ${isSelected ? selectedBg : rowBg} ${isUnlocked ? "" : "opacity-60"}`}
            >
                <View className="flex-row items-center">
                    <ThemePreview accentHex={theme.accentHex} secondaryHex={theme.secondaryHex} bgClass={theme.bg} />
                    <View className="ml-4">
                        <Text className={`font-black text-lg ${textClass}`}>
                            {t(`themes.${theme.id}`) || theme.id}
                        </Text>
                        {!isUnlocked && (
                            <Text className="text-rose-500 font-black text-xs uppercase tracking-widest">
                                {t("common.locked")}
                            </Text>
                        )}
                        {isSelected && (
                            <Text className="text-indigo-500 font-black text-xs uppercase tracking-widest">
                                {t("common.selected")}
                            </Text>
                        )}
                    </View>
                </View>
                <View>
                    {isSelected ? (
                        <Ionicons name="checkmark-circle" size={28} color="#6366f1" />
                    ) : !isUnlocked ? (
                        <Ionicons name="lock-closed" size={22} color={isDark ? "#475569" : "#cbd5e1"} />
                    ) : null}
                </View>
            </Pressable>
        </Animated.View>
    );
}

const THEME_NAMES = {
    default: { tr: "Klasik Parti", en: "Classic Party" },
    neon_shhh: { tr: "Neon Shhh", en: "Neon Shhh" },
    retro_buzz: { tr: "Retro Buzz", en: "Retro Buzz" },
    golden_victory: { tr: "Altın Zafer", en: "Golden Victory" },
    pixel_guesser: { tr: "Piksel Tahmin", en: "Pixel Guesser" },
    graffiti_shhh: { tr: "Graffiti Shhh", en: "Graffiti Shhh" },
};

export default function StoreScreen({ navigation }) {
    const { settings, isThemeBundlePurchased, isExtraWordsPurchased, isPremium, updateSettings } = useGameStore();
    const [loading, setLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState(null);
    const [prices, setPrices] = useState({});
    const themeBundleBannerRef = useRef(null);
    const scrollRef = useRef(null);
    const theme = useTheme();
    const { t, locale } = useTranslation();

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
            setAlertConfig({ title: t("common.error"), message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            await restorePurchases();
            setAlertConfig({
                title: t("common.success"),
                message: t("store.restoreSuccess"),
            });
        } catch (error) {
            setAlertConfig({ title: t("common.error"), message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const translateTheme = (id) => THEME_NAMES[id]?.[locale] || THEME_NAMES[id]?.tr || id;
    const localT = (k) => {
        if (k.startsWith("themes.")) return translateTheme(k.slice("themes.".length));
        return t(k);
    };

    const scrollToThemeBundle = () => {
        if (themeBundleBannerRef.current && scrollRef.current) {
            themeBundleBannerRef.current.measureLayout(
                scrollRef.current.getNativeScrollRef?.() || scrollRef.current,
                (_x, y) => {
                    scrollRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
                },
                () => { }
            );
        }
    };

    const surfaceClass = theme.isDark ? "bg-slate-900" : "bg-slate-50";
    const headerBg = theme.isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100";
    const textClass = theme.isDark ? "text-slate-100" : "text-slate-800";
    const mutedClass = theme.isDark ? "text-slate-400" : "text-slate-500";

    return (
        <SafeAreaView className={`flex-1 ${surfaceClass}`}>
            <StatusBar barStyle={theme.statusBar} />

            <View className={`flex-row items-center px-4 py-3 border-b shadow-sm z-10 ${headerBg}`}>
                <Pressable
                    onPress={() => {
                        hapticLight();
                        navigation.goBack();
                    }}
                    hitSlop={12}
                    accessibilityLabel={t("common.back")}
                    accessibilityRole="button"
                    className="p-2 -ml-2 active:opacity-60"
                >
                    <Ionicons name="arrow-back" size={26} color={theme.isDark ? "#f1f5f9" : "#0f172a"} />
                </Pressable>
                <Text className={`text-2xl font-black ml-2 uppercase tracking-widest ${textClass}`}>
                    {t("store.title")}
                </Text>
                {isPremium && (
                    <View className="ml-auto bg-amber-400 px-3 py-1 rounded-full flex-row items-center">
                        <Ionicons name="star" size={14} color="white" />
                        <Text className="text-white font-black text-xs ml-1 uppercase tracking-widest">
                            {t("common.premium")}
                        </Text>
                    </View>
                )}
            </View>

            <ScrollView
                ref={scrollRef}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                <StaggeredCard delay={0}>
                    <Pressable
                        className={`mb-5 flex-row items-center justify-center py-3 rounded-2xl shadow-sm active:opacity-80 ${theme.isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"}`}
                        onPress={() => {
                            hapticLight();
                            handleRestore();
                        }}
                        disabled={loading}
                        android_ripple={{ color: "#00000010" }}
                    >
                        <Ionicons name="refresh-circle" size={20} color="#6366f1" />
                        <Text className="ml-2 text-indigo-500 font-black tracking-tight">
                            {t("store.restore")}
                        </Text>
                    </Pressable>
                </StaggeredCard>

                {!isPremium && (
                    <StaggeredCard delay={80}>
                        <View className="bg-rose-500 p-6 rounded-[28px] shadow-xl mb-5 items-center">
                            <View className="absolute top-3 right-3 bg-yellow-300 px-2 py-0.5 rounded-full">
                                <Text className="text-rose-800 font-black text-[10px] uppercase tracking-widest">
                                    {t("store.mostPopular")}
                                </Text>
                            </View>
                            <View className="bg-white/20 p-3 rounded-full mb-2">
                                <Ionicons name="ban" size={36} color="white" />
                            </View>
                            <Text className="text-white text-2xl font-black uppercase tracking-widest text-center mb-1">
                                {t("store.noAdsTitle")}
                            </Text>
                            <Text className="text-rose-100 text-center font-bold mb-4 text-xs px-2">
                                {t("store.noAdsSubtitle")}
                            </Text>
                            <AppButton
                                label={`${t("store.removeAds")}${prices["tabu_reklamsiz_v1"] ? ` — ${prices["tabu_reklamsiz_v1"]}` : ""}`}
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
                                {t("store.extraWordsTitle")}
                            </Text>
                            <Text className="text-emerald-100 text-center font-bold mb-4 text-xs px-2">
                                {t("store.extraWordsSubtitle")}
                            </Text>
                            <AppButton
                                label={`${t("store.buyPack")}${prices["tabu_ekstra_kelime_1"] ? ` — ${prices["tabu_ekstra_kelime_1"]}` : ""}`}
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
                        <View ref={themeBundleBannerRef} collapsable={false} className="bg-indigo-600 p-6 rounded-[28px] shadow-xl mb-6 items-center">
                            <View className="bg-white/20 p-3 rounded-full mb-2">
                                <Ionicons name="color-palette" size={36} color="white" />
                            </View>
                            <Text className="text-white text-2xl font-black uppercase tracking-widest text-center mb-1">
                                {t("store.themeBundleTitle")}
                            </Text>
                            <Text className="text-indigo-200 text-center font-bold mb-4 text-xs px-2">
                                {t("store.themeBundleSubtitle")}
                            </Text>
                            <AppButton
                                label={`${t("store.buyPack")}${prices["tabu_tema_paketi_1"] ? ` — ${prices["tabu_tema_paketi_1"]}` : ""}`}
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

                <Text className={`font-black uppercase tracking-widest text-xs mb-3 ml-2 ${mutedClass}`}>
                    {t("store.themes")}
                </Text>
                <View className="gap-3">
                    {BUNDLE_THEMES.map((themeDef, i) => {
                        const isUnlocked = themeDef.id === "default" || isThemeBundlePurchased;
                        const isSelected = settings.selectedTheme === themeDef.id;

                        return (
                            <StaggeredCard key={themeDef.id} delay={320 + i * 70}>
                                <ThemeRow
                                    theme={themeDef}
                                    isUnlocked={isUnlocked}
                                    isSelected={isSelected}
                                    disabled={loading}
                                    t={localT}
                                    isDark={theme.isDark}
                                    onPress={() => {
                                        if (isUnlocked) {
                                            hapticSelection();
                                            updateSettings({ selectedTheme: themeDef.id });
                                        } else {
                                            hapticWarning();
                                            scrollToThemeBundle();
                                            setAlertConfig({
                                                title: t("common.locked"),
                                                message: t("store.lockedMessage"),
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
                        {t("common.processing")}
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
