import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    withRepeat,
    withSequence,
    interpolateColor,
    useDerivedValue,
    Easing,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const formatTime = (seconds) => {
    const safe = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${s < 10 ? `0${s}` : s}`;
};

/**
 * Animated circular timer.
 * Props:
 *  - timeLeft: seconds remaining
 *  - total: initial duration (for progress %)
 *  - size: px (default 110)
 *  - stroke: ring thickness (default 10)
 *  - dark: boolean for dark surface
 */
export default function CircularTimer({ timeLeft = 60, total = 60, size = 110, stroke = 10, dark = false }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    const progress = useSharedValue(1);
    const pulse = useSharedValue(1);
    const colorPhase = useSharedValue(0);

    useEffect(() => {
        const safeTotal = Math.max(1, total || 1);
        const ratio = Math.max(0, Math.min(1, (timeLeft || 0) / safeTotal));
        progress.value = withTiming(ratio, { duration: 400, easing: Easing.out(Easing.cubic) });

        if (timeLeft <= 5) colorPhase.value = withTiming(1, { duration: 300 });
        else if (timeLeft <= 10) colorPhase.value = withTiming(0.5, { duration: 300 });
        else colorPhase.value = withTiming(0, { duration: 300 });
    }, [timeLeft, total]);

    useEffect(() => {
        if (timeLeft <= 8 && timeLeft > 0) {
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1.08, { duration: 350 }),
                    withTiming(1, { duration: 350 })
                ),
                -1,
                false
            );
        } else {
            pulse.value = withTiming(1, { duration: 200 });
        }
    }, [timeLeft]);

    const strokeColor = useDerivedValue(() =>
        interpolateColor(
            colorPhase.value,
            [0, 0.5, 1],
            ["#10b981", "#f59e0b", "#ef4444"]
        )
    );

    const ringAnimatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circumference * (1 - progress.value),
        stroke: strokeColor.value,
    }));

    const textAnimatedStyle = {
        transform: [{ scale: pulse }],
    };

    const trackColor = dark ? "#1e293b" : "#e2e8f0";
    const textColor = dark ? "#f1f5f9" : "#0f172a";

    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={stroke}
                    fill="none"
                />

                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference}, ${circumference}`}
                    animatedProps={ringAnimatedProps}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>

            <Animated.View
                pointerEvents="none"
                style={[
                    { position: "absolute", alignItems: "center", justifyContent: "center" },
                    textAnimatedStyle,
                ]}
            >
                <Text style={{ color: textColor, fontWeight: "900", fontSize: size * 0.3 }}>
                    {formatTime(timeLeft)}
                </Text>
            </Animated.View>
        </View>
    );
}
