import React, { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

/**
 * Animated score number that scales + color flashes on change.
 * Green pop when score increases, red shake when it decreases.
 */
export default function AnimatedScore({ value = 0, className = "", style, size = 36 }) {
    const scale = useSharedValue(1);
    const shakeX = useSharedValue(0);
    const prev = useRef(value);
    const [color, setColor] = useState("#0ea5e9");
    const [display, setDisplay] = useState(value);

    useEffect(() => {
        const previous = prev.current;
        prev.current = value;

        if (value === previous) return;

        setDisplay(value);

        if (value > previous) {
            setColor("#10b981");
            scale.value = withSequence(
                withSpring(1.35, { damping: 8, stiffness: 220 }),
                withSpring(1, { damping: 10, stiffness: 180 })
            );
        } else {
            setColor("#ef4444");
            shakeX.value = withSequence(
                withTiming(-6, { duration: 50 }),
                withTiming(6, { duration: 50 }),
                withTiming(-4, { duration: 50 }),
                withTiming(4, { duration: 50 }),
                withTiming(0, { duration: 60 })
            );
        }

        const t = setTimeout(() => setColor("#0ea5e9"), 500);
        return () => clearTimeout(t);
    }, [value]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateX: shakeX.value }],
    }));

    return (
        <Animated.View style={animatedStyle}>
            <Text
                className={className}
                style={[
                    { color, fontSize: size, fontWeight: "900", lineHeight: size * 1.1 },
                    style,
                ]}
                allowFontScaling={false}
            >
                {display}
            </Text>
        </Animated.View>
    );
}
