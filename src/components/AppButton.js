import React, { useMemo } from "react";
import { Pressable, Text, View, ActivityIndicator, Platform } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { hapticLight, hapticMedium } from "../utils/haptics";
import { palette, shadows } from "../theme/tokens";

const VARIANTS = {
    primary: {
        bg: "bg-fuchsia-700",
        text: "text-white",
        iconColor: "white",
        glow: palette.primary,
    },
    accent: {
        bg: "bg-amber-400",
        text: "text-white",
        iconColor: "white",
        glow: palette.accent,
    },
    info: {
        bg: "bg-sky-500",
        text: "text-white",
        iconColor: "white",
        glow: palette.info,
    },
    success: {
        bg: "bg-emerald-500",
        text: "text-white",
        iconColor: "white",
        glow: palette.success,
    },
    danger: {
        bg: "bg-red-500",
        text: "text-white",
        iconColor: "white",
        glow: palette.danger,
    },
    dark: {
        bg: "bg-slate-900",
        text: "text-white",
        iconColor: "white",
        glow: "#0f172a",
    },
    ghost: {
        bg: "bg-white/90",
        text: "text-slate-700",
        iconColor: "#475569",
        glow: "#0f172a",
    },
    outline: {
        bg: "bg-white",
        text: "text-slate-800",
        iconColor: "#334155",
        glow: "#0f172a",
    },
};

const SIZES = {
    sm: { py: "py-3", text: "text-sm", icon: 18, radius: "rounded-2xl" },
    md: { py: "py-4", text: "text-base", icon: 22, radius: "rounded-2xl" },
    lg: { py: "py-5", text: "text-lg", icon: 24, radius: "rounded-3xl" },
    xl: { py: "py-6", text: "text-xl", icon: 26, radius: "rounded-3xl" },
};

export default function AppButton({
    label,
    icon,
    iconRight,
    onPress,
    variant = "primary",
    size = "lg",
    fullWidth = true,
    disabled = false,
    loading = false,
    haptic = "light",
    uppercase = true,
    italic = false,
    style,
    className = "",
    textClassName = "",
    glow = true,
    testID,
    accessibilityLabel,
    badge,
}) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const v = VARIANTS[variant] || VARIANTS.primary;
    const s = SIZES[size] || SIZES.lg;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = () => {
        if (disabled || loading) return;
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
        opacity.value = withTiming(0.9, { duration: 80 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
        opacity.value = withTiming(1, { duration: 120 });
    };

    const handlePress = () => {
        if (disabled || loading) return;
        if (haptic === "light") hapticLight();
        else if (haptic === "medium") hapticMedium();
        onPress?.();
    };

    const glowStyle = useMemo(
        () => (glow && !disabled ? shadows.glow(v.glow) : shadows.sm),
        [glow, disabled, v.glow]
    );

    const disabledExtra = disabled ? "opacity-60" : "";
    const labelStyles = [
        italic ? "italic" : "",
        uppercase ? "uppercase tracking-widest" : "",
        "font-black",
        v.text,
        s.text,
        textClassName,
    ].join(" ");

    return (
        <Animated.View
            style={[animatedStyle, glowStyle, fullWidth ? { width: "100%" } : null, style]}
            className={`${s.radius} ${v.bg} ${disabledExtra} ${fullWidth ? "" : "self-start"}`}
        >
            {badge != null && badge !== false ? (
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        minWidth: 26,
                        height: 26,
                        paddingHorizontal: 6,
                        borderRadius: 13,
                        backgroundColor: "#0f172a",
                        borderWidth: 2,
                        borderColor: "#ffffff",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                    }}
                >
                    <Text
                        allowFontScaling={false}
                        style={{ color: "white", fontWeight: "900", fontSize: 11 }}
                    >
                        {badge}
                    </Text>
                </View>
            ) : null}
            <Pressable
                testID={testID}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel || (typeof label === "string" ? label : undefined)}
                accessibilityState={{ disabled: disabled || loading }}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
                hitSlop={8}
                disabled={disabled || loading}
                android_ripple={Platform.OS === "android" ? { color: "#ffffff22" } : undefined}
                className={`${s.py} px-5 ${s.radius} flex-row items-center justify-center ${className}`}
            >
                {loading ? (
                    <ActivityIndicator color={v.iconColor} size="small" />
                ) : (
                    <>
                        {icon ? (
                            <View style={{ marginRight: label ? 10 : 0 }}>
                                <Ionicons name={icon} size={s.icon} color={v.iconColor} />
                            </View>
                        ) : null}
                        {label ? <Text className={labelStyles}>{label}</Text> : null}
                        {iconRight ? (
                            <View style={{ marginLeft: label ? 10 : 0 }}>
                                <Ionicons name={iconRight} size={s.icon} color={v.iconColor} />
                            </View>
                        ) : null}
                    </>
                )}
            </Pressable>
        </Animated.View>
    );
}
