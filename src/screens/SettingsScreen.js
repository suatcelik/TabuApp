import React from "react";
import {
    View,
    Text,
    Pressable,
    StatusBar,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
} from "react-native-reanimated";
import useGameStore from "../store/useGameStore";
import AppButton from "../components/AppButton";
import { hapticSelection, hapticLight } from "../utils/haptics";

function OptionPill({ active, label, onPress, activeClass = "bg-fuchsia-700" }) {
    const scale = useSharedValue(1);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            style={[style, { flex: 1 }]}
            className={`rounded-2xl ${active ? `${activeClass} border-transparent` : "bg-white border-slate-200"} border-2`}
        >
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !!active }}
                hitSlop={6}
                onPressIn={() => {
                    scale.value = withSpring(0.94, { damping: 15, stiffness: 260 });
                }}
                onPressOut={() => {
                    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
                }}
                onPress={() => {
                    hapticSelection();
                    onPress?.();
                }}
                className="py-4 items-center justify-center"
            >
                <Text className={`text-lg font-black ${active ? "text-white" : "text-slate-600"}`}>
                    {label}
                </Text>
            </Pressable>
        </Animated.View>
    );
}

function SelectionGroup({ label, options, currentVal, field, activeClass, updateField, delay = 0 }) {
    const translateY = useSharedValue(20);
    const opacity = useSharedValue(0);

    React.useEffect(() => {
        translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 160 }));
        opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View style={style} className="mb-7">
            <Text className="text-slate-500 font-black uppercase tracking-widest text-xs ml-2 mb-3">
                {label}
            </Text>
            <View className="flex-row gap-3">
                {options.map((opt) => (
                    <OptionPill
                        key={opt}
                        label={opt}
                        active={currentVal === opt}
                        activeClass={activeClass}
                        onPress={() => updateField(field, opt)}
                    />
                ))}
            </View>
        </Animated.View>
    );
}

export default function SettingsScreen({ navigation }) {
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);

    const durationOptions = [60, 90, 120];
    const maxPassOptions = [3, 4, 5];
    const roundsOptions = [4, 6, 8, 10];

    const updateField = (field, value) => {
        updateSettings({ [field]: value });
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />

            <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100 shadow-sm">
                <Pressable
                    onPress={() => {
                        hapticLight();
                        navigation.goBack();
                    }}
                    hitSlop={12}
                    accessibilityLabel="Geri"
                    accessibilityRole="button"
                    className="p-2 active:opacity-60"
                >
                    <Ionicons name="arrow-back" size={26} color="#0f172a" />
                </Pressable>
                <Text className="ml-2 text-2xl font-black text-slate-800 uppercase tracking-tighter">
                    Ayarlar
                </Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="bg-blue-800 p-5 rounded-[28px] border-2 border-slate-900 shadow-lg mb-8">
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="people" size={20} color="white" />
                            <Text className="text-white font-black ml-2 uppercase tracking-widest">Takımlar</Text>
                        </View>

                        <View>
                            <Text className="text-blue-200 text-xs font-black mb-2 ml-1 tracking-widest">1. TAKIM</Text>
                            <TextInput
                                value={settings?.teamAName ?? "Takım A"}
                                onChangeText={(t) => updateField("teamAName", t)}
                                placeholder="Takım A"
                                placeholderTextColor="#94a3b8"
                                className="bg-white border-2 border-slate-900 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                maxLength={15}
                                returnKeyType="next"
                                accessibilityLabel="Takım A adı"
                            />
                        </View>

                        <View className="mt-4">
                            <Text className="text-blue-200 text-xs font-black mb-2 ml-1 tracking-widest">2. TAKIM</Text>
                            <TextInput
                                value={settings?.teamBName ?? "Takım B"}
                                onChangeText={(t) => updateField("teamBName", t)}
                                placeholder="Takım B"
                                placeholderTextColor="#94a3b8"
                                className="bg-white border-2 border-slate-900 rounded-2xl px-4 py-3 text-slate-800 font-bold"
                                maxLength={15}
                                returnKeyType="done"
                                accessibilityLabel="Takım B adı"
                            />
                        </View>
                    </View>

                    <SelectionGroup
                        label="Tur Süresi (Saniye)"
                        options={durationOptions}
                        currentVal={settings?.duration}
                        field="duration"
                        activeClass="bg-orange-500"
                        updateField={updateField}
                        delay={0}
                    />

                    <SelectionGroup
                        label="Toplam Tur Sayısı"
                        options={roundsOptions}
                        currentVal={settings?.roundsPerTeam}
                        field="roundsPerTeam"
                        activeClass="bg-emerald-500"
                        updateField={updateField}
                        delay={80}
                    />

                    <SelectionGroup
                        label="Pas Hakkı"
                        options={maxPassOptions}
                        currentVal={settings?.maxPass}
                        field="maxPass"
                        activeClass="bg-fuchsia-700"
                        updateField={updateField}
                        delay={160}
                    />

                    <View className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 mb-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <View className="bg-indigo-100 p-2 rounded-xl mr-3">
                                    <Ionicons name="phone-portrait" size={20} color="#4f46e5" />
                                </View>
                                <Text className="text-slate-700 font-black text-base">Titreşim</Text>
                            </View>
                            <Switch
                                value={settings?.vibration !== false}
                                onValueChange={(v) => {
                                    hapticLight();
                                    updateField("vibration", v);
                                }}
                                trackColor={{ false: "#cbd5e1", true: "#a21caf" }}
                                thumbColor="#ffffff"
                            />
                        </View>
                    </View>

                    <Pressable
                        onPress={() => {
                            hapticLight();
                            navigation.navigate("PrivacyPolicy");
                        }}
                        android_ripple={{ color: "#00000010" }}
                        accessibilityRole="button"
                        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex-row items-center justify-between active:opacity-80"
                    >
                        <View className="flex-row items-center">
                            <View className="bg-indigo-100 p-2 rounded-xl">
                                <Ionicons name="shield-checkmark" size={20} color="#4f46e5" />
                            </View>
                            <Text className="ml-3 text-slate-700 font-black">Gizlilik Politikası</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                    </Pressable>
                </ScrollView>

                <View className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                    <AppButton
                        label="Ayarları Kaydet"
                        icon="checkmark-circle"
                        variant="dark"
                        size="lg"
                        haptic="medium"
                        onPress={() => navigation.goBack()}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
