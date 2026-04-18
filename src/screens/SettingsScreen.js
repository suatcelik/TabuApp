import React from "react";
import {
    View,
    Text,
    Pressable,
    StatusBar,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
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
import AppButton from "../components/AppButton";
import { hapticSelection, hapticLight } from "../utils/haptics";
import useTheme from "../hooks/useTheme";
import useTranslation from "../hooks/useTranslation";
import { SUPPORTED_LOCALES } from "../i18n";

const DURATION_META = {
    60: { icon: "flash", label: "60" },
    90: { icon: "flame", label: "90" },
    120: { icon: "snow", label: "120" },
};

function OptionPill({ active, label, icon, onPress, activeClass = "bg-fuchsia-700", isDark }) {
    const scale = useSharedValue(1);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const inactiveBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
    const inactiveText = isDark ? "text-slate-300" : "text-slate-600";

    return (
        <Animated.View
            style={[style, { flex: 1 }]}
            className={`rounded-2xl ${active ? `${activeClass} border-transparent` : inactiveBg} border-2`}
        >
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !!active }}
                accessibilityLabel={String(label)}
                hitSlop={6}
                onPressIn={() => {
                    scale.value = withSpring(0.94, { damping: 15, stiffness: 260 });
                }}
                onPressOut={() => {
                    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
                }}
                onPress={() => {
                    hapticSelection();
                    onPress?.();
                }}
                className="py-3 items-center justify-center"
            >
                {icon ? (
                    <Ionicons name={icon} size={16} color={active ? "#ffffff" : isDark ? "#cbd5e1" : "#64748b"} />
                ) : null}
                <Text className={`text-base font-black mt-0.5 ${active ? "text-white" : inactiveText}`}>
                    {label}
                </Text>
            </Pressable>
        </Animated.View>
    );
}

function SelectionGroup({ label, options, currentVal, field, activeClass, updateField, delay = 0, renderOption, isDark, textMutedClass }) {
    const translateY = useSharedValue(20);
    const opacity = useSharedValue(0);

    React.useEffect(() => {
        translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 160 }));
        opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View style={style} className="mb-6">
            <Text className={`font-black uppercase tracking-widest text-xs ml-2 mb-3 ${textMutedClass}`}>
                {label}
            </Text>
            <View className="flex-row gap-2">
                {options.map((opt) => {
                    const rendered = renderOption ? renderOption(opt) : { label: String(opt), icon: null };
                    return (
                        <OptionPill
                            key={String(opt)}
                            label={rendered.label}
                            icon={rendered.icon}
                            active={currentVal === opt}
                            activeClass={activeClass}
                            onPress={() => updateField(field, opt)}
                            isDark={isDark}
                        />
                    );
                })}
            </View>
        </Animated.View>
    );
}

export default function SettingsScreen({ navigation }) {
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const theme = useTheme();
    const { t, locale } = useTranslation();

    const durationOptions = [60, 90, 120];
    const maxPassOptions = [3, 4, 5];
    const roundsOptions = [4, 6, 8, 10];

    const updateField = (field, value) => {
        updateSettings({ [field]: value });
    };

    const headerBg = theme.isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100";

    return (
        <SafeAreaView className={`flex-1 ${theme.surfaceClass}`}>
            <StatusBar barStyle={theme.statusBar} />

            <View className={`flex-row items-center px-4 py-3 border-b shadow-sm ${headerBg}`}>
                <Pressable
                    onPress={() => {
                        hapticLight();
                        navigation.goBack();
                    }}
                    hitSlop={12}
                    accessibilityLabel={t("common.back")}
                    accessibilityRole="button"
                    className="p-2 active:opacity-60"
                >
                    <Ionicons name="arrow-back" size={26} color={theme.isDark ? "#f1f5f9" : "#0f172a"} />
                </Pressable>
                <Text className={`ml-2 text-2xl font-black uppercase tracking-tighter ${theme.textClass}`}>
                    {t("settings.title")}
                </Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="bg-indigo-800 p-5 rounded-[28px] border-2 border-slate-900 shadow-lg mb-6">
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="people" size={20} color="white" />
                            <Text className="text-white font-black ml-2 uppercase tracking-widest">
                                {t("settings.teams")}
                            </Text>
                        </View>

                        <View>
                            <Text className="text-indigo-200 text-xs font-black mb-2 ml-1 tracking-widest">
                                {t("settings.team1")}
                            </Text>
                            <TextInput
                                value={settings?.teamAName ?? "Takım A"}
                                onChangeText={(v) => updateField("teamAName", v)}
                                placeholder={t("home.teamA")}
                                placeholderTextColor="#94a3b8"
                                className="bg-white border-2 border-slate-900 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                maxLength={15}
                                returnKeyType="next"
                                accessibilityLabel={t("home.accessibility.teamAInput")}
                            />
                        </View>

                        <View className="mt-3">
                            <Text className="text-indigo-200 text-xs font-black mb-2 ml-1 tracking-widest">
                                {t("settings.team2")}
                            </Text>
                            <TextInput
                                value={settings?.teamBName ?? "Takım B"}
                                onChangeText={(v) => updateField("teamBName", v)}
                                placeholder={t("home.teamB")}
                                placeholderTextColor="#94a3b8"
                                className="bg-white border-2 border-slate-900 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                maxLength={15}
                                returnKeyType="done"
                                accessibilityLabel={t("home.accessibility.teamBInput")}
                            />
                        </View>
                    </View>

                    <SelectionGroup
                        label={t("settings.duration")}
                        options={durationOptions}
                        currentVal={settings?.duration}
                        field="duration"
                        activeClass="bg-orange-500"
                        updateField={updateField}
                        delay={0}
                        isDark={theme.isDark}
                        textMutedClass={theme.textMutedClass}
                        renderOption={(opt) => ({
                            label: String(opt),
                            icon: DURATION_META[opt]?.icon,
                        })}
                    />

                    <SelectionGroup
                        label={t("settings.rounds")}
                        options={roundsOptions}
                        currentVal={settings?.roundsPerTeam}
                        field="roundsPerTeam"
                        activeClass="bg-emerald-500"
                        updateField={updateField}
                        delay={80}
                        isDark={theme.isDark}
                        textMutedClass={theme.textMutedClass}
                    />

                    <SelectionGroup
                        label={t("settings.maxPass")}
                        options={maxPassOptions}
                        currentVal={settings?.maxPass}
                        field="maxPass"
                        activeClass="bg-fuchsia-700"
                        updateField={updateField}
                        delay={160}
                        isDark={theme.isDark}
                        textMutedClass={theme.textMutedClass}
                    />

                    <View
                        className={`rounded-3xl shadow-sm p-4 mb-3 ${theme.isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-100"}`}
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <View className="bg-indigo-100 p-2 rounded-xl mr-3">
                                    <Ionicons name="phone-portrait" size={20} color="#4f46e5" />
                                </View>
                                <Text className={`${theme.textClass} font-black text-base`}>
                                    {t("settings.vibration")}
                                </Text>
                            </View>
                            <Switch
                                value={settings?.vibration !== false}
                                onValueChange={(v) => {
                                    hapticLight();
                                    updateField("vibration", v);
                                }}
                                trackColor={{ false: "#cbd5e1", true: "#a21caf" }}
                                thumbColor="#ffffff"
                            />
                        </View>
                    </View>

                    <View
                        className={`rounded-3xl shadow-sm p-4 mb-3 ${theme.isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-100"}`}
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <View className="bg-emerald-100 p-2 rounded-xl mr-3">
                                    <Ionicons name="volume-high" size={20} color="#059669" />
                                </View>
                                <Text className={`${theme.textClass} font-black text-base`}>
                                    {t("settings.sound")}
                                </Text>
                            </View>
                            <Switch
                                value={settings?.sound !== false}
                                onValueChange={(v) => {
                                    hapticLight();
                                    updateField("sound", v);
                                }}
                                trackColor={{ false: "#cbd5e1", true: "#059669" }}
                                thumbColor="#ffffff"
                            />
                        </View>
                    </View>

                    <View
                        className={`rounded-3xl shadow-sm p-4 mb-3 ${theme.isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-100"}`}
                    >
                        <View className="flex-row items-center mb-3">
                            <View className="bg-sky-100 p-2 rounded-xl mr-3">
                                <Ionicons name="language" size={20} color="#0284c7" />
                            </View>
                            <Text className={`${theme.textClass} font-black text-base`}>
                                {t("settings.language")}
                            </Text>
                        </View>
                        <View className="flex-row gap-2">
                            {SUPPORTED_LOCALES.map((code) => {
                                const active = locale === code || (!settings?.language && code === locale);
                                const flag = code === "tr" ? "🇹🇷" : "🇬🇧";
                                const label = code === "tr" ? "Türkçe" : "English";
                                return (
                                    <OptionPill
                                        key={code}
                                        label={`${flag}  ${label}`}
                                        active={active}
                                        activeClass="bg-sky-600"
                                        onPress={() => updateField("language", code)}
                                        isDark={theme.isDark}
                                    />
                                );
                            })}
                        </View>
                    </View>

                    <Pressable
                        onPress={() => {
                            hapticLight();
                            navigation.navigate("PrivacyPolicy");
                        }}
                        android_ripple={{ color: "#00000010" }}
                        accessibilityRole="button"
                        className={`p-4 rounded-3xl shadow-sm flex-row items-center justify-between active:opacity-80 ${theme.isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-100"}`}
                    >
                        <View className="flex-row items-center">
                            <View className="bg-indigo-100 p-2 rounded-xl">
                                <Ionicons name="shield-checkmark" size={20} color="#4f46e5" />
                            </View>
                            <Text className={`ml-3 ${theme.textClass} font-black`}>
                                {t("settings.privacyPolicy")}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.isDark ? "#475569" : "#cbd5e1"} />
                    </Pressable>
                </ScrollView>

                <View className={`px-4 py-3 border-t ${theme.isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                    <AppButton
                        label={t("settings.saveSettings")}
                        icon="checkmark-circle"
                        variant="dark"
                        size="lg"
                        haptic="medium"
                        onPress={() => navigation.goBack()}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
