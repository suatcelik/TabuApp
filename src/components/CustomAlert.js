import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { hapticLight } from '../utils/haptics';

export default function CustomAlert({ visible, title, message, buttons, onClose }) {
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

    let headerColor = "bg-fuchsia-700";
    let iconName = "information-circle";

    const titleLower = title?.toLowerCase() || "";
    if (titleLower.includes("hata")) {
        headerColor = "bg-rose-500";
        iconName = "alert-circle";
    } else if (titleLower.includes("başarılı")) {
        headerColor = "bg-emerald-500";
        iconName = "checkmark-circle";
    } else if (titleLower.includes("çık") || titleLower.includes("kilitli")) {
        headerColor = "bg-amber-500";
        iconName = "warning";
    } else if (titleLower.includes("⭐") || titleLower.includes("değerlendir")) {
        headerColor = "bg-amber-400";
        iconName = "star";
    }

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View
                style={[{ flex: 1 }, overlayStyle]}
                className="items-center justify-center bg-black/60 px-6"
            >
                <Animated.View
                    style={cardStyle}
                    className="bg-white w-full rounded-[36px] overflow-hidden shadow-2xl"
                >
                    <View className="pt-8 pb-4 items-center px-6">
                        <View className={`${headerColor} p-4 rounded-full mb-3 shadow-lg`}>
                            <Ionicons name={iconName} size={40} color="white" />
                        </View>
                        <Text className="text-slate-800 text-2xl font-black text-center uppercase tracking-tight">
                            {title}
                        </Text>
                    </View>

                    <View className="px-6 pb-8">
                        <Text className="text-slate-500 text-base font-bold text-center mb-8 leading-6">
                            {message}
                        </Text>

                        <View className="flex-row gap-3">
                            {buttons?.map((btn, index) => {
                                const isCancel = btn.style === 'cancel';
                                const isDestructive = btn.style === 'destructive';

                                let btnBg = "bg-slate-100";
                                let btnText = "text-slate-700";

                                if (isDestructive) {
                                    btnBg = "bg-rose-500";
                                    btnText = "text-white";
                                } else if (!isCancel && index === buttons.length - 1) {
                                    btnBg = headerColor;
                                    btnText = "text-white";
                                }

                                return (
                                    <Pressable
                                        key={index}
                                        android_ripple={{ color: "#ffffff33" }}
                                        hitSlop={6}
                                        className={`flex-1 py-4 rounded-2xl items-center justify-center active:opacity-80 ${btnBg}`}
                                        onPress={() => {
                                            hapticLight();
                                            if (btn.onPress) btn.onPress();
                                            onClose();
                                        }}
                                    >
                                        <Text className={`${btnText} font-black text-base uppercase tracking-wider`}>
                                            {btn.text || "Tamam"}
                                        </Text>
                                    </Pressable>
                                );
                            })}

                            {(!buttons || buttons.length === 0) && (
                                <Pressable
                                    android_ripple={{ color: "#ffffff33" }}
                                    hitSlop={6}
                                    className={`w-full py-4 rounded-2xl items-center justify-center active:opacity-80 ${headerColor}`}
                                    onPress={() => {
                                        hapticLight();
                                        onClose();
                                    }}
                                >
                                    <Text className="text-white font-black text-base uppercase tracking-wider">
                                        Tamam
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}
