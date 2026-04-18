import React, { useEffect } from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
} from "react-native-reanimated";
import GradientBackground from "./GradientBackground";

/**
 * Branded full-screen loading scene — replaces the barely-styled
 * ActivityIndicator that flashed before words loaded.
 */
export default function LoadingScreen({ message = "Yükleniyor..." }) {
    const float = useSharedValue(0);
    const scale = useSharedValue(0.85);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 160 });
        float.value = withRepeat(
            withSequence(
                withTiming(-6, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
                withTiming(6, { duration: 1200, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: float.value }, { scale: scale.value }],
    }));

    return (
        <View style={{ flex: 1, backgroundColor: "#0b0324" }}>
            <GradientBackground variant="celebration" />
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
                <Animated.View style={logoStyle}>
                    <Image
                        source={require("../../assets/logo.png")}
                        style={{ width: 180, height: 180 }}
                        resizeMode="contain"
                        fadeDuration={0}
                    />
                </Animated.View>
                <ActivityIndicator size="large" color="#fde68a" style={{ marginTop: 28 }} />
                <Text
                    allowFontScaling={false}
                    style={{
                        color: "rgba(255,255,255,0.85)",
                        marginTop: 14,
                        fontWeight: "900",
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        fontSize: 12,
                    }}
                >
                    {message}
                </Text>
            </View>
        </View>
    );
}
