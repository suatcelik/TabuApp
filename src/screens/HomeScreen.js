import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StatusBar,
    Image,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
    ScrollView,
    Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
} from "react-native-reanimated";
import useGameStore from "../store/useGameStore";
import { initIAP } from "../services/iapService";
import AppButton from "../components/AppButton";
import FloatingBackground from "../components/FloatingBackground";
import { hapticSelection, hapticLight } from "../utils/haptics";
import { APP_VERSION } from "../theme/appMeta";
import useTheme from "../hooks/useTheme";
import useTranslation from "../hooks/useTranslation";
import { TEAM_COLORS } from "../theme/themes";

function TeamCard({ label, sublabel, value, onChangeText, colorId, onChangeColor, accessibilityLabel, theme }) {
    const selectedHex = TEAM_COLORS.find((c) => c.id === colorId)?.hex || "#a21caf";

    return (
        <View
            className={`rounded-[28px] p-4 ${theme.isDark ? "bg-slate-800" : "bg-white"} shadow-xl border ${theme.isDark ? "border-slate-700" : "border-slate-200"}`}
        >
            <View className="flex-row items-center mb-2">
                <View
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: selectedHex,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text className="text-white font-black" allowFontScaling={false}>
                        {label.charAt(0)}
                    </Text>
                </View>
                <Text
                    className={`ml-3 font-black text-[11px] uppercase tracking-widest ${theme.textMutedClass}`}
                    allowFontScaling={false}
                >
                    {sublabel}
                </Text>
            </View>

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={label}
                placeholderTextColor={theme.isDark ? "#64748b" : "#94a3b8"}
                className={`rounded-2xl px-3 py-3 font-extrabold text-center ${theme.isDark ? "bg-slate-900 text-slate-100 border border-slate-700" : "bg-slate-50 text-slate-800 border border-slate-200"}`}
                maxLength={15}
                returnKeyType="done"
                accessibilityLabel={accessibilityLabel}
            />

            <View className="flex-row flex-wrap justify-center gap-2 mt-3">
                {TEAM_COLORS.map((c) => {
                    const selected = c.id === colorId;
                    return (
                        <Pressable
                            key={c.id}
                            onPress={() => {
                                hapticSelection();
                                onChangeColor?.(c.id);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            accessibilityLabel={c.label}
                            hitSlop={6}
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: c.hex,
                                borderWidth: selected ? 3 : 0,
                                borderColor: "#ffffff",
                                shadowColor: c.hex,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: selected ? 0.6 : 0.15,
                                shadowRadius: 6,
                                elevation: selected ? 4 : 1,
                            }}
                        />
                    );
                })}
            </View>
        </View>
    );
}

export default function HomeScreen({ navigation }) {
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const resetGame = useGameStore((s) => s.resetGame);
    const lastGame = useGameStore((s) => s.lastGame);

    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const theme = useTheme();
    const { t } = useTranslation();

    const logoSize = Math.min(Math.round(width * 0.45), 180);
    const isShort = height < 700;

    const teamBRef = useRef(null);

    const logoScale = useSharedValue(0.6);
    const logoOpacity = useSharedValue(0);
    const logoFloat = useSharedValue(0);
    const cardsTranslate = useSharedValue(40);
    const cardsOpacity = useSharedValue(0);
    const chipsTranslate = useSharedValue(40);
    const chipsOpacity = useSharedValue(0);
    const buttonsTranslate = useSharedValue(40);
    const buttonsOpacity = useSharedValue(0);

    useEffect(() => {
        initIAP().catch((e) => console.log("Açılış IAP Başlatma Hatası:", e));

        logoOpacity.value = withTiming(1, { duration: 420 });
        logoScale.value = withSpring(1, { damping: 12, stiffness: 160, mass: 0.8 });
        logoFloat.value = withRepeat(
            withSequence(
                withTiming(-6, { duration: 1800 }),
                withTiming(6, { duration: 1800 })
            ),
            -1,
            true
        );

        cardsOpacity.value = withDelay(160, withTiming(1, { duration: 420 }));
        cardsTranslate.value = withDelay(160, withSpring(0, { damping: 14, stiffness: 160 }));

        chipsOpacity.value = withDelay(320, withTiming(1, { duration: 420 }));
        chipsTranslate.value = withDelay(320, withSpring(0, { damping: 14, stiffness: 160 }));

        buttonsOpacity.value = withDelay(480, withTiming(1, { duration: 420 }));
        buttonsTranslate.value = withDelay(480, withSpring(0, { damping: 14, stiffness: 160 }));
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }, { translateY: logoFloat.value }],
        opacity: logoOpacity.value,
    }));

    const cardsStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: cardsTranslate.value }],
        opacity: cardsOpacity.value,
    }));

    const chipsStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: chipsTranslate.value }],
        opacity: chipsOpacity.value,
    }));

    const buttonsStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: buttonsTranslate.value }],
        opacity: buttonsOpacity.value,
    }));

    const handleStart = () => {
        resetGame();
        navigation.navigate("Game");
    };

    const backgroundVariant = theme.isDark ? "dark" : "light";

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.surfaceBg }} edges={["top", "bottom"]}>
            <StatusBar barStyle={theme.statusBar} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <FloatingBackground variant={backgroundVariant} />

                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* LOGO + last game strip */}
                    <View style={{ alignItems: "center", paddingTop: isShort ? 4 : 12 }}>
                        <Animated.View style={logoStyle}>
                            <Image
                                source={require("../../assets/logo.png")}
                                style={{ width: logoSize, height: logoSize }}
                                resizeMode="contain"
                                fadeDuration={0}
                            />
                        </Animated.View>

                        {lastGame ? (
                            <Pressable
                                onPress={() => {
                                    hapticLight();
                                    navigation.navigate("Leaderboard");
                                }}
                                accessibilityRole="button"
                                hitSlop={6}
                                className={`flex-row items-center gap-2 px-3 py-1.5 rounded-full ${theme.isDark ? "bg-slate-800 border border-slate-700" : "bg-white/80 border border-slate-200"} active:opacity-70`}
                            >
                                <Ionicons name="trophy" size={14} color={theme.isDark ? "#fbbf24" : "#a21caf"} />
                                <Text className={`font-black text-[11px] uppercase tracking-widest ${theme.textMutedClass}`}>
                                    {t("home.lastGame")}: {lastGame.scoreA}-{lastGame.scoreB}
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>

                    {/* TEAM CARDS (vertical) */}
                    <Animated.View style={[cardsStyle, { marginTop: isShort ? 10 : 16, gap: 12 }]}>
                        <TeamCard
                            label={t("home.teamA")}
                            sublabel={t("settings.team1")}
                            value={settings?.teamAName}
                            onChangeText={(v) => updateSettings({ teamAName: v })}
                            colorId={settings?.teamAColor}
                            onChangeColor={(id) => updateSettings({ teamAColor: id })}
                            accessibilityLabel={t("home.accessibility.teamAInput")}
                            theme={theme}
                        />
                        <View style={{ alignItems: "center", marginVertical: -6 }}>
                            <View className="bg-slate-900 w-12 h-12 rounded-full items-center justify-center shadow-lg">
                                <Text className="text-white font-black italic" allowFontScaling={false}>VS</Text>
                            </View>
                        </View>
                        <TeamCard
                            label={t("home.teamB")}
                            sublabel={t("settings.team2")}
                            value={settings?.teamBName}
                            onChangeText={(v) => updateSettings({ teamBName: v })}
                            colorId={settings?.teamBColor}
                            onChangeColor={(id) => updateSettings({ teamBColor: id })}
                            accessibilityLabel={t("home.accessibility.teamBInput")}
                            theme={theme}
                        />
                    </Animated.View>

                    {/* QUICK CHIPS */}
                    <Animated.View style={[chipsStyle, { marginTop: 14 }]}>
                        <View className="flex-row gap-2">
                            <Pressable
                                onPress={() => {
                                    hapticLight();
                                    navigation.navigate("HowToPlay");
                                }}
                                className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 rounded-2xl ${theme.isDark ? "bg-slate-800 border border-slate-700" : "bg-white/85 border border-slate-200"} active:opacity-80`}
                                accessibilityRole="button"
                                accessibilityLabel={t("home.howToPlay")}
                                hitSlop={6}
                            >
                                <Ionicons name="help-circle" size={18} color={theme.isDark ? "#f1f5f9" : "#475569"} />
                                <Text className={`font-black text-xs uppercase tracking-widest ${theme.textClass}`}>
                                    {t("home.howToPlay")}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    hapticLight();
                                    navigation.navigate("Leaderboard");
                                }}
                                className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 rounded-2xl ${theme.isDark ? "bg-slate-800 border border-slate-700" : "bg-white/85 border border-slate-200"} active:opacity-80`}
                                accessibilityRole="button"
                                accessibilityLabel={t("home.leaderboard")}
                                hitSlop={6}
                            >
                                <Ionicons name="podium" size={18} color={theme.isDark ? "#f1f5f9" : "#475569"} />
                                <Text className={`font-black text-xs uppercase tracking-widest ${theme.textClass}`}>
                                    {t("home.leaderboard")}
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>

                    {/* BUTTONS */}
                    <Animated.View
                        style={[
                            buttonsStyle,
                            {
                                paddingBottom: Math.max(insets.bottom, 12) + 12,
                                paddingTop: 14,
                            },
                        ]}
                    >
                        <AppButton
                            label={t("home.start")}
                            icon="play"
                            variant="primary"
                            size="xl"
                            italic
                            haptic="medium"
                            onPress={handleStart}
                            style={{ marginBottom: 10 }}
                            accessibilityLabel={t("home.accessibility.start")}
                        />

                        <View className="flex-row gap-2">
                            <AppButton
                                label={t("home.store")}
                                icon="cart"
                                variant="accent"
                                size="md"
                                onPress={() => {
                                    hapticSelection();
                                    navigation.navigate("Store");
                                }}
                                style={{ flex: 1 }}
                                accessibilityLabel={t("home.accessibility.store")}
                            />

                            <AppButton
                                label={t("home.settings")}
                                icon="settings-sharp"
                                variant={theme.isDark ? "dark" : "outline"}
                                size="md"
                                glow={false}
                                onPress={() => {
                                    hapticSelection();
                                    navigation.navigate("Settings");
                                }}
                                style={{ flex: 1 }}
                                accessibilityLabel={t("home.accessibility.settings")}
                            />
                        </View>

                        <Text className={`text-center text-[11px] mt-4 font-bold uppercase tracking-widest ${theme.textMutedClass}`}>
                            v{APP_VERSION}
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
