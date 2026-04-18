import React from "react";
import { View, Text, Pressable, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import useTranslation from "../hooks/useTranslation";
import useTheme from "../hooks/useTheme";
import { hapticLight } from "../utils/haptics";

function Section({ icon, color, bg, title, body, delay }) {
    const opacity = useSharedValue(0);
    const translate = useSharedValue(20);

    React.useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
        translate.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 160 }));
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translate.value }],
    }));

    return (
        <Animated.View
            style={style}
            className="flex-row bg-white rounded-3xl p-4 mb-3 shadow-sm border border-slate-100"
        >
            <View className={`${bg} w-12 h-12 rounded-2xl items-center justify-center mr-4`}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View className="flex-1 pr-2">
                <Text className="text-slate-900 font-black text-base uppercase tracking-widest mb-1">
                    {title}
                </Text>
                <Text className="text-slate-600 font-semibold leading-5">{body}</Text>
            </View>
        </Animated.View>
    );
}

export default function HowToPlayScreen({ navigation }) {
    const { t } = useTranslation();
    const theme = useTheme();

    const sections = [
        {
            icon: "flag",
            color: "#a21caf",
            bg: "bg-fuchsia-100",
            title: t("howTo.section1Title"),
            body: t("howTo.section1Body"),
        },
        {
            icon: "checkmark-circle",
            color: "#059669",
            bg: "bg-emerald-100",
            title: t("howTo.section2Title"),
            body: t("howTo.section2Body"),
        },
        {
            icon: "close-circle",
            color: "#dc2626",
            bg: "bg-rose-100",
            title: t("howTo.section3Title"),
            body: t("howTo.section3Body"),
        },
        {
            icon: "refresh",
            color: "#d97706",
            bg: "bg-amber-100",
            title: t("howTo.section4Title"),
            body: t("howTo.section4Body"),
        },
        {
            icon: "trophy",
            color: "#b45309",
            bg: "bg-yellow-100",
            title: t("howTo.section5Title"),
            body: t("howTo.section5Body"),
        },
    ];

    return (
        <SafeAreaView className={`flex-1 ${theme.surfaceClass}`} edges={["top", "bottom"]}>
            <StatusBar barStyle={theme.statusBar} />

            <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
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
                    <Ionicons name="arrow-back" size={26} color="#0f172a" />
                </Pressable>
                <Text className="ml-2 text-2xl font-black text-slate-800 uppercase tracking-tighter">
                    {t("howTo.title")}
                </Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                {sections.map((s, i) => (
                    <Section key={s.title} {...s} delay={i * 110} />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}
