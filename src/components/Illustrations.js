import React from "react";
import Svg, { Circle, Path, G, Rect, Line, Defs, LinearGradient, Stop } from "react-native-svg";

/**
 * Lightweight inline SVG illustrations for empty / error states.
 * No external asset dependency.
 */

export function ConnectionIllustration({ size = 160, primary = "#a21caf", accent = "#f59e0b" }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 160 160">
            <Defs>
                <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={primary} stopOpacity="0.15" />
                    <Stop offset="1" stopColor={primary} stopOpacity="0" />
                </LinearGradient>
            </Defs>
            <Circle cx="80" cy="80" r="72" fill="url(#bgGrad)" />
            <G transform="translate(80 88)">
                <Path
                    d="M -42 10 A 60 60 0 0 1 42 10"
                    stroke={primary}
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.25"
                />
                <Path
                    d="M -28 -2 A 40 40 0 0 1 28 -2"
                    stroke={primary}
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.5"
                />
                <Path
                    d="M -14 -14 A 20 20 0 0 1 14 -14"
                    stroke={primary}
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                />
                <Circle cx="0" cy="2" r="5" fill={primary} />
                <Line x1="-48" y1="-48" x2="48" y2="30" stroke={accent} strokeWidth="8" strokeLinecap="round" />
            </G>
        </Svg>
    );
}

export function EmptyWordsIllustration({ size = 160, primary = "#a21caf", accent = "#f59e0b" }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 160 160">
            <Defs>
                <LinearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={primary} stopOpacity="0.9" />
                    <Stop offset="1" stopColor={primary} stopOpacity="0.55" />
                </LinearGradient>
            </Defs>
            <Circle cx="80" cy="80" r="72" fill={primary} opacity="0.08" />
            <G transform="translate(36 44)">
                <Rect x="0" y="0" width="88" height="68" rx="14" fill="url(#cardGrad)" />
                <Rect x="14" y="14" width="60" height="8" rx="4" fill="white" opacity="0.9" />
                <Rect x="14" y="30" width="44" height="6" rx="3" fill="white" opacity="0.6" />
                <Rect x="14" y="44" width="52" height="6" rx="3" fill="white" opacity="0.6" />
            </G>
            <Circle cx="112" cy="36" r="10" fill={accent} />
            <Path d="M108 36 l4 4 l8 -8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
    );
}

export function EmptyLeaderboardIllustration({ size = 160, primary = "#a21caf", accent = "#f59e0b" }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 160 160">
            <Circle cx="80" cy="80" r="72" fill={primary} opacity="0.08" />
            <G transform="translate(30 54)">
                <Rect x="0" y="28" width="28" height="32" rx="6" fill={primary} opacity="0.45" />
                <Rect x="36" y="8" width="28" height="52" rx="6" fill={accent} />
                <Rect x="72" y="20" width="28" height="40" rx="6" fill={primary} opacity="0.7" />
            </G>
            <G transform="translate(80 62)">
                <Path
                    d="M -10 -8 l 10 -14 l 10 14 l -4 14 l -12 0 z"
                    fill={accent}
                />
            </G>
        </Svg>
    );
}
