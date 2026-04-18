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
import useGameStore from "../store/useGameStore";
import useTranslation from "../hooks/useTranslation";
import useTheme from "../hooks/useTheme";
import { EmptyLeaderboardIllustration } from "../components/Illustrations";
import { hapticLight } from "../utils/haptics";

function Row({ rank, entry, delay, isDark }) {
    const opacity = useSharedValue(0);
    const translate = useSharedValue(16);

    React.useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 320 }));
        translate.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 160 }));
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translate.value }],
    }));

    const medalColor = rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : rank === 3 ? "#b45309" : null;
    const winnerName =
        entry.winner === "A"
            ? entry.teamAName
            : entry.winner === "B"
                ? entry.teamBName
                : "—";
    const score = `${entry.scoreA} - ${entry.scoreB}`;
    const dateStr = new Date(entry.date).toLocaleDateString();

    const bgClass = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100";
    const textClass = isDark ? "text-slate-100" : "text-slate-800";
    const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

    return (
        <Animated.View style={style} className={`flex-row items-center p-4 rounded-3xl border mb-2 ${bgClass}`}>
            <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: medalColor || (isDark ? "#334155" : "#e2e8f0") }}
            >
                {medalColor ? (
                    <Ionicons name="medal" size={18} color="white" />
                ) : (
                    <Text className="text-slate-700 font-black" allowFontScaling={false}>#{rank}</Text>
                )}
            </View>
            <View className="flex-1">
                <Text className={`font-black text-base ${textClass}`} numberOfLines={1}>
                    {winnerName}
                </Text>
                <Text className={`text-[11px] font-bold uppercase tracking-widest ${mutedClass}`}>
                    {entry.teamAName} vs {entry.teamBName} · {dateStr}
                </Text>
            </View>
            <View className="items-end">
                <Text className={`font-black text-xl ${textClass}`} allowFontScaling={false}>
                    {score}
                </Text>
            </View>
        </Animated.View>
    );
}

export default function LeaderboardScreen({ navigation }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const leaderboard = useGameStore((s) => s.leaderboard || []);
    const top10 = leaderboard.slice(0, 10);

    return (
        <SafeAreaView className={`flex-1 ${theme.surfaceClass}`} edges={["top", "bottom"]}>
            <StatusBar barStyle={theme.statusBar} />

            <View className={`flex-row items-center px-4 py-3 border-b ${theme.isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                <Pressable
                    onPress={() => {
                        hapticLight();
                        navigation.goBack();
                    }}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t("common.back")}
                    className="p-2 active:opacity-60"
                >
                    <Ionicons name="arrow-back" size={26} color={theme.isDark ? "#f1f5f9" : "#0f172a"} />
                </Pressable>
                <Text className={`ml-2 text-2xl font-black uppercase tracking-tighter ${theme.textClass}`}>
                    {t("leaderboard.title")}
                </Text>
            </View>

            {top10.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <EmptyLeaderboardIllustration size={180} />
                    <Text className={`text-center mt-4 text-base font-bold ${theme.textMutedClass}`}>
                        {t("leaderboard.empty")}
                    </Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    {top10.map((entry, i) => (
                        <Row
                            key={`${entry.date}-${i}`}
                            rank={i + 1}
                            entry={entry}
                            delay={i * 60}
                            isDark={theme.isDark}
                        />
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
