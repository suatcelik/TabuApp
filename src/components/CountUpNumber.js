import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedReaction,
    withTiming,
    withDelay,
    Easing,
    runOnJS,
} from "react-native-reanimated";

/**
 * Tick-counts from 0 to `value` when mounted.
 * - Runs on worklet; updates display via runOnJS at ~60fps (throttled via rounding).
 * - Use `delay` to stagger counter reveals.
 */
export default function CountUpNumber({
    value = 0,
    duration = 900,
    delay = 0,
    style,
    className,
    allowFontScaling = false,
}) {
    const progress = useSharedValue(0);
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        progress.value = 0;
        setDisplay(0);
        progress.value = withDelay(
            delay,
            withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
        );
    }, [value, duration, delay]);

    useAnimatedReaction(
        () => Math.round(progress.value * value),
        (current, previous) => {
            if (current !== previous) {
                runOnJS(setDisplay)(current);
            }
        },
        [value]
    );

    return (
        <Animated.Text style={style} className={className} allowFontScaling={allowFontScaling}>
            {display}
        </Animated.Text>
    );
}
