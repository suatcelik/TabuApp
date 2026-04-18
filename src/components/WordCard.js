import React, { forwardRef, useImperativeHandle, useEffect } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withSpring,
    withDelay,
    Easing,
} from "react-native-reanimated";

/**
 * Animated word card. Parent controls content but can trigger visual feedback:
 *   ref.current.success()
 *   ref.current.taboo()
 *   ref.current.pass()
 * A fresh slide-in animation is triggered automatically when `currentIndex` changes.
 */
const WordCard = forwardRef(function WordCard(
    { word, forbiddenWords, headerBg = "bg-fuchsia-700", headerTextColor = "text-white", isDark = false, currentIndex = 0 },
    ref
) {
    const { width } = useWindowDimensions();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);
    const rotate = useSharedValue(0);
    const scale = useSharedValue(1);
    const flashOpacity = useSharedValue(0);
    const flashColor = useSharedValue(0); // 0 = success/green, 1 = taboo/red

    useEffect(() => {
        translateX.value = -width * 0.3;
        opacity.value = 0;
        scale.value = 0.95;
        rotate.value = -6;

        translateX.value = withSpring(0, { damping: 14, stiffness: 160 });
        rotate.value = withSpring(0, { damping: 12, stiffness: 180 });
        scale.value = withSpring(1, { damping: 12, stiffness: 180 });
        opacity.value = withTiming(1, { duration: 220 });
    }, [currentIndex]);

    const runSuccess = () => {
        flashColor.value = 0;
        flashOpacity.value = withSequence(
            withTiming(0.55, { duration: 120 }),
            withTiming(0, { duration: 260 })
        );
        scale.value = withSequence(
            withSpring(1.06, { damping: 8, stiffness: 220 }),
            withSpring(1, { damping: 10, stiffness: 180 })
        );
        translateX.value = withSequence(
            withTiming(width * 0.9, { duration: 260, easing: Easing.in(Easing.cubic) }),
            withTiming(0, { duration: 0 })
        );
        opacity.value = withSequence(
            withTiming(0, { duration: 220 }),
            withTiming(1, { duration: 1 })
        );
    };

    const runTaboo = () => {
        flashColor.value = 1;
        flashOpacity.value = withSequence(
            withTiming(0.55, { duration: 120 }),
            withTiming(0, { duration: 260 })
        );
        translateX.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-8, { duration: 50 }),
            withTiming(8, { duration: 50 }),
            withTiming(0, { duration: 60 })
        );
        translateX.value = withDelay(
            260,
            withSequence(
                withTiming(-width * 0.9, { duration: 260, easing: Easing.in(Easing.cubic) }),
                withTiming(0, { duration: 0 })
            )
        );
        opacity.value = withDelay(
            260,
            withSequence(
                withTiming(0, { duration: 220 }),
                withTiming(1, { duration: 1 })
            )
        );
    };

    const runPass = () => {
        translateY.value = withSequence(
            withTiming(-40, { duration: 220, easing: Easing.in(Easing.cubic) }),
            withTiming(0, { duration: 0 })
        );
        opacity.value = withSequence(
            withTiming(0, { duration: 200 }),
            withTiming(1, { duration: 1 })
        );
    };

    useImperativeHandle(ref, () => ({
        success: runSuccess,
        taboo: runTaboo,
        pass: runPass,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotateZ: `${rotate.value}deg` },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    const flashStyle = useAnimatedStyle(() => ({
        opacity: flashOpacity.value,
        backgroundColor: flashColor.value > 0.5 ? "#ef4444" : "#10b981",
    }));

    const textColor = isDark ? "text-slate-100" : "text-slate-800";
    const dividerColor = isDark ? "bg-slate-700" : "bg-slate-100";
    const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100";

    return (
        <Animated.View
            style={[cardStyle, { overflow: "hidden", borderRadius: 36 }]}
            className={`${cardBg} border shadow-2xl`}
        >
            <View className={`${headerBg} py-10 items-center`}>
                <Text
                    className={`${headerTextColor} text-4xl font-black uppercase tracking-tighter text-center px-4`}
                    allowFontScaling={false}
                    numberOfLines={2}
                >
                    {word || "—"}
                </Text>
            </View>

            <View className="py-8 items-center">
                {(forbiddenWords || []).map((w, index) => (
                    <View key={`${w}-${index}`} className="py-2 w-full items-center">
                        <Text
                            className={`${textColor} text-2xl font-bold uppercase tracking-tight`}
                            allowFontScaling={false}
                        >
                            {w}
                        </Text>
                        {index < (forbiddenWords?.length ?? 0) - 1 && (
                            <View className={`w-1/2 h-[1px] mt-2 ${dividerColor}`} />
                        )}
                    </View>
                ))}
            </View>

            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 36,
                    },
                    flashStyle,
                ]}
            />
        </Animated.View>
    );
});

export default WordCard;
