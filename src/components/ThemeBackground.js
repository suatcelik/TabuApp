import React, { memo } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getTheme } from "../theme/themes";

const IconPattern = memo(function IconPattern({ color, opacity = 0.1 }) {
    return (
        <View
            className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden"
            style={{ opacity }}
            pointerEvents="none"
        >
            <Ionicons name="ban" size={120} color={color} style={{ position: "absolute", top: -20, left: -20, transform: [{ rotate: "-15deg" }] }} />
            <Ionicons name="chatbubbles" size={100} color={color} style={{ position: "absolute", top: 40, right: -10, transform: [{ rotate: "10deg" }] }} />
            <Ionicons name="hourglass" size={140} color={color} style={{ position: "absolute", top: "40%", left: -30, transform: [{ rotate: "25deg" }] }} />
            <Ionicons name="mic" size={110} color={color} style={{ position: "absolute", top: "60%", right: -20, transform: [{ rotate: "-20deg" }] }} />
            <Ionicons name="volume-mute" size={130} color={color} style={{ position: "absolute", bottom: -30, left: "30%", transform: [{ rotate: "5deg" }] }} />
        </View>
    );
});

/**
 * Static, memoized background matched to a theme id.
 * Only re-renders when `themeId` actually changes — major win over the inline
 * `renderThemeBackground` we used to rebuild every GameScreen tick.
 */
const ThemeBackground = memo(function ThemeBackground({ themeId }) {
    const theme = getTheme(themeId);

    if (themeId === "neon_shhh") {
        return (
            <View className="absolute top-0 left-0 right-0 bottom-0 bg-slate-900" pointerEvents="none">
                <View className="absolute -top-10 -left-10 w-80 h-80 rounded-full bg-cyan-500/20" />
                <View className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-fuchsia-600/20" />
                <IconPattern color="#22d3ee" opacity={0.15} />
            </View>
        );
    }
    if (themeId === "retro_buzz") {
        return (
            <View className="absolute top-0 left-0 right-0 bottom-0 bg-orange-50" pointerEvents="none">
                <View className="absolute -top-10 -left-10 w-96 h-96 rounded-full bg-amber-200/40" />
                <View className="absolute -bottom-10 -right-10 w-96 h-96 rounded-full bg-orange-300/30" />
                <IconPattern color="#f59e0b" opacity={0.2} />
            </View>
        );
    }
    if (themeId === "golden_victory") {
        return (
            <View className="absolute top-0 left-0 right-0 bottom-0 bg-zinc-900" pointerEvents="none">
                <View className="absolute top-0 left-0 right-0 bottom-0 bg-yellow-900/10" />
                <IconPattern color="#eab308" opacity={0.15} />
            </View>
        );
    }
    if (themeId === "pixel_guesser") {
        return (
            <View className="absolute top-0 left-0 right-0 bottom-0 bg-emerald-50" pointerEvents="none">
                <View className="absolute top-1/4 -left-10 w-64 h-64 rounded-xl bg-emerald-200/50" style={{ transform: [{ rotate: "12deg" }] }} />
                <View className="absolute bottom-1/4 -right-10 w-64 h-64 rounded-xl bg-teal-200/50" style={{ transform: [{ rotate: "-12deg" }] }} />
                <IconPattern color="#10b981" opacity={0.15} />
            </View>
        );
    }
    if (themeId === "graffiti_shhh") {
        return (
            <View className="absolute top-0 left-0 right-0 bottom-0 bg-rose-50" pointerEvents="none">
                <View className="absolute -top-10 -left-10 w-80 h-80 rounded-full bg-rose-200/50" />
                <View className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-pink-200/50" />
                <IconPattern color="#e11d48" opacity={0.15} />
            </View>
        );
    }

    return (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-slate-50" pointerEvents="none">
            <View className="absolute -top-10 -left-10 w-80 h-80 rounded-full bg-fuchsia-200/40" />
            <View className="absolute top-1/3 -right-16 w-[350px] h-[350px] rounded-full bg-sky-200/30" />
            <View className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-amber-100/40" />
            <IconPattern color="#94a3b8" opacity={0.05} />
        </View>
    );
});

export default ThemeBackground;
