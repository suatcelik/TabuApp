import React, { useEffect } from "react";
import {
    View,
    Text,
    StatusBar,
    Image,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
    ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
} from "react-native-reanimated";
import useGameStore from "../store/useGameStore";
import { initIAP } from "../services/iapService";
import AppButton from "../components/AppButton";
import FloatingBackground from "../components/FloatingBackground";
import { hapticSelection } from "../utils/haptics";
import { APP_VERSION } from "../theme/appMeta";

export default function HomeScreen({ navigation }) {
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const resetGame = useGameStore((s) => s.resetGame);

    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();

    const logoSize = Math.min(Math.round(width * 0.6), 260);
    const isShort = height < 700;

    const logoScale = useSharedValue(0.6);
    const logoOpacity = useSharedValue(0);
    const logoFloat = useSharedValue(0);
    const cardTranslate = useSharedValue(40);
    const cardOpacity = useSharedValue(0);
    const buttonsTranslate = useSharedValue(40);
    const buttonsOpacity = useSharedValue(0);

    useEffect(() => {
        initIAP().catch((e) => console.log("Açılış IAP Başlatma Hatası:", e));

        logoOpacity.value = withTiming(1, { duration: 420 });
        logoScale.value = withSpring(1, { damping: 12, stiffness: 160, mass: 0.8 });
        logoFloat.value = withRepeat(
            withSequence(
                withTiming(-6, { duration: 1800 }),
                withTiming(6, { duration: 1800 })
            ),
            -1,
            true
        );

        cardOpacity.value = withDelay(200, withTiming(1, { duration: 420 }));
        cardTranslate.value = withDelay(200, withSpring(0, { damping: 14, stiffness: 160 }));

        buttonsOpacity.value = withDelay(360, withTiming(1, { duration: 420 }));
        buttonsTranslate.value = withDelay(360, withSpring(0, { damping: 14, stiffness: 160 }));
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }, { translateY: logoFloat.value }],
        opacity: logoOpacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: cardTranslate.value }],
        opacity: cardOpacity.value,
    }));

    const buttonsStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: buttonsTranslate.value }],
        opacity: buttonsOpacity.value,
    }));

    const handleStart = () => {
        resetGame();
        navigation.navigate("Game");
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }} edges={["top", "bottom"]}>
            <StatusBar barStyle="dark-content" />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <FloatingBackground variant="light" />

                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <Animated.View style={logoStyle}>
                            <Image
                                source={require("../../assets/logo.png")}
                                style={{ width: logoSize, height: logoSize, marginTop: isShort ? 0 : 8 }}
                                resizeMode="contain"
                                fadeDuration={0}
                            />
                        </Animated.View>

                        <Animated.View
                            style={[
                                cardStyle,
                                { marginTop: isShort ? 8 : 16, width: "100%" },
                            ]}
                            className="bg-white p-5 rounded-[28px] border border-slate-800 shadow-xl"
                        >
                            <Text className="text-slate-950 text-center font-bold uppercase tracking-widest text-[11px] mb-4">
                                Takım İsimlerini Düzenle
                            </Text>

                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <TextInput
                                        value={settings?.teamAName}
                                        onChangeText={(t) => updateSettings({ teamAName: t })}
                                        placeholder="Takım A"
                                        placeholderTextColor="#94a3b8"
                                        className="bg-slate-50 border border-slate-800 rounded-2xl px-3 py-3 text-slate-800 font-extrabold text-center"
                                        maxLength={15}
                                        returnKeyType="done"
                                        accessibilityLabel="Takım A adı"
                                    />
                                </View>

                                <View className="px-4">
                                    <Text className="font-black text-slate-950 text-2xl italic">VS</Text>
                                </View>

                                <View className="flex-1">
                                    <TextInput
                                        value={settings?.teamBName}
                                        onChangeText={(t) => updateSettings({ teamBName: t })}
                                        placeholder="Takım B"
                                        placeholderTextColor="#94a3b8"
                                        className="bg-slate-50 border border-slate-800 rounded-2xl px-3 py-3 text-slate-800 font-extrabold text-center"
                                        maxLength={15}
                                        returnKeyType="done"
                                        accessibilityLabel="Takım B adı"
                                    />
                                </View>
                            </View>
                        </Animated.View>
                    </View>

                    <Animated.View
                        style={[
                            buttonsStyle,
                            {
                                paddingBottom: Math.max(insets.bottom, 12) + 12,
                                paddingTop: 12,
                            },
                        ]}
                    >
                        <AppButton
                            label="BAŞLA!"
                            icon="play"
                            variant="primary"
                            size="xl"
                            italic
                            haptic="medium"
                            onPress={handleStart}
                            style={{ marginBottom: 12 }}
                            accessibilityLabel="Oyunu başlat"
                        />

                        <AppButton
                            label="MAĞAZA & TEMALAR"
                            icon="cart"
                            variant="accent"
                            size="lg"
                            onPress={() => {
                                hapticSelection();
                                navigation.navigate("Store");
                            }}
                            style={{ marginBottom: 12 }}
                            accessibilityLabel="Mağaza ve temalar"
                        />

                        <AppButton
                            label="AYARLAR"
                            icon="settings-sharp"
                            variant="outline"
                            size="lg"
                            glow={false}
                            onPress={() => {
                                hapticSelection();
                                navigation.navigate("Settings");
                            }}
                            accessibilityLabel="Ayarlar"
                        />

                        <Text className="text-center text-slate-400 text-[10px] mt-4 font-bold uppercase tracking-widest">
                            v{APP_VERSION}
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
