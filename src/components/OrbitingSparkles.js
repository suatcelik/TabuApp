import React, { useEffect } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
    withSequence,
} from "react-native-reanimated";

function Sparkle({ index, count, radius, duration, iconName, iconSize, color }) {
    const rotation = useSharedValue(0);
    const twinkle = useSharedValue(0.6);

    const angleOffset = (index / count) * 360;

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration, easing: Easing.linear }),
            -1,
            false
        );
        twinkle.value = withDelay(
            index * 160,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
                    withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.quad) })
                ),
                -1,
                true
            )
        );
    }, []);

    const style = useAnimatedStyle(() => {
        const angle = ((rotation.value + angleOffset) * Math.PI) / 180;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return {
            transform: [
                { translateX: x },
                { translateY: y },
                { scale: 0.8 + twinkle.value * 0.5 },
            ],
            opacity: twinkle.value,
        };
    });

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    position: "absolute",
                    alignItems: "center",
                    justifyContent: "center",
                },
                style,
            ]}
        >
            <Ionicons name={iconName} size={iconSize} color={color} />
        </Animated.View>
    );
}

/**
 * Icons orbiting around a central element while gently twinkling.
 * Pure transform animations (worklet) — no JS overhead.
 */
export default function OrbitingSparkles({
    radius = 110,
    count = 6,
    duration = 14000,
    icons = ["sparkles", "star", "sparkles", "star", "sparkles", "star"],
    color = "#fde68a",
    iconSize = 20,
}) {
    return (
        <View
            pointerEvents="none"
            style={{
                position: "absolute",
                width: radius * 2,
                height: radius * 2,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {Array.from({ length: count }).map((_, i) => (
                <Sparkle
                    key={i}
                    index={i}
                    count={count}
                    radius={radius}
                    duration={duration}
                    iconName={icons[i % icons.length]}
                    iconSize={iconSize}
                    color={color}
                />
            ))}
        </View>
    );
}
