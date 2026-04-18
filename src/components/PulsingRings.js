import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withRepeat,
    withTiming,
    Easing,
} from "react-native-reanimated";

function Ring({ size, color, delay = 0, duration = 2200 }) {
    const scale = useSharedValue(0.4);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withDelay(
            delay,
            withRepeat(
                withTiming(1.6, { duration, easing: Easing.out(Easing.quad) }),
                -1,
                false
            )
        );
        opacity.value = withDelay(
            delay,
            withRepeat(
                withTiming(0, { duration, easing: Easing.out(Easing.quad) }),
                -1,
                false
            )
        );
        setTimeout(() => {
            opacity.value = 0.9;
        }, delay);
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    position: "absolute",
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: 3,
                    borderColor: color,
                },
                style,
            ]}
        />
    );
}

/**
 * Three staggered expanding rings behind a central element.
 * `size` is the starting diameter; rings scale up to ~1.6x and fade out.
 */
export default function PulsingRings({ size = 170, color = "#fde68a" }) {
    return (
        <View
            pointerEvents="none"
            style={{
                width: size,
                height: size,
                alignItems: "center",
                justifyContent: "center",
                position: "absolute",
            }}
        >
            <Ring size={size} color={color} delay={0} duration={2400} />
            <Ring size={size} color={color} delay={800} duration={2400} />
            <Ring size={size} color={color} delay={1600} duration={2400} />
        </View>
    );
}
