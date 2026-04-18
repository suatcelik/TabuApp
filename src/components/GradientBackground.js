import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * Full-bleed vertical + radial gradient background for hero/result scenes.
 *
 * variant:
 *   - "victory"   → rich magenta → violet → midnight
 *   - "defeat"    → deep slate → indigo-navy (used for draw)
 *   - "celebration" → vivid pink → orange glow
 *
 * Pure static SVG (no JS driven re-renders). Animated foreground layers sit on top.
 */
const PRESETS = {
    victory: {
        linear: [
            { offset: "0", color: "#7c1d6f" },
            { offset: "0.5", color: "#5b21b6" },
            { offset: "1", color: "#1e1b4b" },
        ],
        radial: { color: "#f0abfc", opacity: 0.35 },
    },
    celebration: {
        linear: [
            { offset: "0", color: "#e11d48" },
            { offset: "0.6", color: "#9333ea" },
            { offset: "1", color: "#1e1b4b" },
        ],
        radial: { color: "#fde68a", opacity: 0.28 },
    },
    defeat: {
        linear: [
            { offset: "0", color: "#1e293b" },
            { offset: "0.6", color: "#1e1b4b" },
            { offset: "1", color: "#020617" },
        ],
        radial: { color: "#818cf8", opacity: 0.22 },
    },
};

export default function GradientBackground({ variant = "victory" }) {
    const preset = PRESETS[variant] || PRESETS.victory;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
                <Defs>
                    <LinearGradient id="bgLinear" x1="0" y1="0" x2="0" y2="1">
                        {preset.linear.map((s, i) => (
                            <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity="1" />
                        ))}
                    </LinearGradient>
                    <RadialGradient id="bgRadial" cx="50%" cy="25%" r="70%" fx="50%" fy="25%">
                        <Stop offset="0" stopColor={preset.radial.color} stopOpacity={preset.radial.opacity} />
                        <Stop offset="1" stopColor={preset.radial.color} stopOpacity="0" />
                    </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgLinear)" />
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgRadial)" />
            </Svg>
        </View>
    );
}
