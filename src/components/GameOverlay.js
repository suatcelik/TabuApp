import React, { useEffect } from "react";
import { Modal, View } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from "react-native-reanimated";

/**
 * Shared overlay shell: dimmed backdrop + spring-scaled card.
 * Use for pause, round-end, upsell, error modals so every overlay in the
 * game has a consistent entrance animation and layout.
 */
export default function GameOverlay({
    visible,
    onRequestClose,
    children,
    backdropClassName = "bg-black/60",
    alignTop = false,
}) {
    const scale = useSharedValue(0.9);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            scale.value = withSpring(1, { damping: 14, stiffness: 220, mass: 0.8 });
            opacity.value = withTiming(1, { duration: 180 });
        } else {
            scale.value = withTiming(0.9, { duration: 120 });
            opacity.value = withTiming(0, { duration: 120 });
        }
    }, [visible]);

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onRequestClose}>
            <Animated.View
                style={[{ flex: 1 }, overlayStyle]}
                className={`items-center ${alignTop ? "justify-start pt-24" : "justify-center"} ${backdropClassName} px-6`}
            >
                <Animated.View style={[cardStyle, { width: "100%" }]}>
                    <View className="w-full">{children}</View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}
