import React, { useRef, useState } from "react";
import {
    View,
    Text,
    Pressable,
    FlatList,
    useWindowDimensions,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from "react-native-reanimated";
import GradientBackground from "../components/GradientBackground";
import AppButton from "../components/AppButton";
import useGameStore from "../store/useGameStore";
import useTranslation from "../hooks/useTranslation";
import { hapticLight, hapticSelection } from "../utils/haptics";

function FloatingIcon({ name, color }) {
    const y = useSharedValue(0);

    React.useEffect(() => {
        y.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
                withTiming(8, { duration: 1400, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: y.value }],
    }));

    return (
        <Animated.View
            style={[
                style,
                {
                    width: 150,
                    height: 150,
                    borderRadius: 75,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    borderWidth: 1.5,
                    borderColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 14 },
                    shadowOpacity: 0.6,
                    shadowRadius: 24,
                    elevation: 12,
                },
            ]}
        >
            <Ionicons name={name} size={80} color={color} />
        </Animated.View>
    );
}

export default function OnboardingScreen({ navigation }) {
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const setOnboardingSeen = useGameStore((s) => s.setOnboardingSeen);

    const [index, setIndex] = useState(0);
    const listRef = useRef(null);

    const slides = [
        {
            key: "slide1",
            icon: "game-controller",
            iconColor: "#fde68a",
            title: t("onboarding.slide1.title"),
            subtitle: t("onboarding.slide1.subtitle"),
        },
        {
            key: "slide2",
            icon: "hand-left",
            iconColor: "#fca5a5",
            title: t("onboarding.slide2.title"),
            subtitle: t("onboarding.slide2.subtitle"),
        },
        {
            key: "slide3",
            icon: "trophy",
            iconColor: "#fde047",
            title: t("onboarding.slide3.title"),
            subtitle: t("onboarding.slide3.subtitle"),
        },
    ];

    const finish = () => {
        setOnboardingSeen();
        navigation.replace("Home");
    };

    const handleNext = () => {
        hapticLight();
        if (index < slides.length - 1) {
            const next = index + 1;
            listRef.current?.scrollToIndex({ index: next, animated: true });
            setIndex(next);
        } else {
            finish();
        }
    };

    const handleSkip = () => {
        hapticSelection();
        finish();
    };

    const renderItem = ({ item }) => (
        <View style={{ width, paddingHorizontal: 32, alignItems: "center", justifyContent: "center" }}>
            <FloatingIcon name={item.icon} color={item.iconColor} />
            <Text
                allowFontScaling={false}
                style={{
                    color: "white",
                    fontWeight: "900",
                    fontSize: 38,
                    letterSpacing: -1,
                    marginTop: 32,
                    textAlign: "center",
                }}
            >
                {item.title}
            </Text>
            <Text
                style={{
                    color: "rgba(255,255,255,0.75)",
                    fontWeight: "600",
                    fontSize: 16,
                    marginTop: 12,
                    textAlign: "center",
                    lineHeight: 24,
                }}
            >
                {item.subtitle}
            </Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: "#0b0324" }}>
            <GradientBackground variant="celebration" />
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
                <View className="flex-row justify-end px-6 pt-2">
                    <Pressable
                        onPress={handleSkip}
                        accessibilityRole="button"
                        accessibilityLabel={t("onboarding.skip")}
                        hitSlop={10}
                        className="py-2 px-4 active:opacity-70"
                    >
                        <Text className="text-white/80 font-black uppercase tracking-widest text-xs">
                            {t("onboarding.skip")}
                        </Text>
                    </Pressable>
                </View>

                <FlatList
                    ref={listRef}
                    data={slides}
                    keyExtractor={(s) => s.key}
                    renderItem={renderItem}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                        const next = Math.round(e.nativeEvent.contentOffset.x / width);
                        if (next !== index) setIndex(next);
                    }}
                />

                <View className="flex-row items-center justify-center mb-6 gap-2">
                    {slides.map((_, i) => (
                        <View
                            key={i}
                            style={{
                                width: i === index ? 24 : 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: i === index ? "#fde68a" : "rgba(255,255,255,0.3)",
                            }}
                        />
                    ))}
                </View>

                <View className="px-6 pb-4">
                    <AppButton
                        label={index < slides.length - 1 ? t("onboarding.next") : t("onboarding.start")}
                        icon={index < slides.length - 1 ? "arrow-forward" : "play"}
                        iconRight={undefined}
                        variant="accent"
                        size="xl"
                        italic
                        haptic="medium"
                        onPress={handleNext}
                    />
                </View>
            </SafeAreaView>
        </View>
    );
}
