import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from "react-native-reanimated";

/**
 * Lightweight animated background blobs.
 * Blobs float up/down slowly with very low CPU cost (only transforms).
 * variant: "light" | "dark" | "warm" | "cool"
 */
const variants = {
    light: [
        { class: "absolute -top-10 -left-10 w-80 h-80 rounded-full bg-fuchsia-200/60", dur: 6000, range: 10 },
        { class: "absolute -top-5 -right-10 w-72 h-72 rounded-full bg-rose-200/50", dur: 7200, range: 12 },
        { class: "absolute top-1/3 -right-16 w-[340px] h-[340px] rounded-full bg-sky-200/50", dur: 8400, range: 14 },
        { class: "absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-amber-100/70", dur: 6600, range: 10 },
    ],
    warm: [
        { class: "absolute -top-10 -left-10 w-80 h-80 rounded-full bg-amber-200/70", dur: 6000, range: 10 },
        { class: "absolute -top-5 -right-10 w-72 h-72 rounded-full bg-rose-200/60", dur: 7200, range: 12 },
        { class: "absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-orange-200/60", dur: 6600, range: 10 },
    ],
    cool: [
        { class: "absolute -top-10 -left-10 w-80 h-80 rounded-full bg-sky-200/60", dur: 6000, range: 10 },
        { class: "absolute top-1/3 -right-16 w-[340px] h-[340px] rounded-full bg-indigo-200/50", dur: 8400, range: 14 },
        { class: "absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-emerald-100/60", dur: 6600, range: 10 },
    ],
    dark: [
        { class: "absolute -top-10 -left-10 w-80 h-80 rounded-full bg-cyan-500/20", dur: 6000, range: 10 },
        { class: "absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-fuchsia-600/20", dur: 7200, range: 12 },
    ],
};

function Blob({ classes, dur, range, delay }) {
    const y = useSharedValue(0);

    useEffect(() => {
        y.value = withRepeat(
            withSequence(
                withTiming(range, { duration: dur, easing: Easing.inOut(Easing.quad) }),
                withTiming(-range, { duration: dur, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: y.value }],
    }));

    return <Animated.View className={classes} style={style} />;
}

export default function FloatingBackground({ variant = "light" }) {
    const blobs = variants[variant] || variants.light;

    return (
        <View
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}
            pointerEvents="none"
        >
            {blobs.map((b, i) => (
                <Blob key={i} classes={b.class} dur={b.dur} range={b.range} delay={i * 200} />
            ))}
        </View>
    );
}
