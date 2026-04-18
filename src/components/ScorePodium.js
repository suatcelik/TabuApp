import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import CountUpNumber from "./CountUpNumber";

const MAX_BAR_HEIGHT = 140;
const MIN_BAR_HEIGHT = 40;

function Bar({ label, score, isWinner, color, delay, maxScore }) {
    const heightVal = useSharedValue(0);
    const labelOpacity = useSharedValue(0);
    const crownScale = useSharedValue(0);
    const crownRotate = useSharedValue(-30);

    const targetHeight =
        maxScore <= 0
            ? MIN_BAR_HEIGHT
            : MIN_BAR_HEIGHT +
            (Math.max(0, score) / Math.max(1, maxScore)) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);

    useEffect(() => {
        heightVal.value = withDelay(
            delay,
            withSpring(targetHeight, { damping: 14, stiffness: 140, mass: 0.9 })
        );
        labelOpacity.value = withDelay(delay + 300, withTiming(1, { duration: 320 }));

        if (isWinner) {
            crownScale.value = withDelay(
                delay + 600,
                withSpring(1, { damping: 8, stiffness: 220, mass: 0.8 })
            );
            crownRotate.value = withDelay(
                delay + 600,
                withSpring(0, { damping: 10, stiffness: 180 })
            );
        }
    }, [targetHeight, isWinner]);

    const barStyle = useAnimatedStyle(() => ({
        height: heightVal.value,
    }));

    const labelStyle = useAnimatedStyle(() => ({
        opacity: labelOpacity.value,
    }));

    const crownStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: crownScale.value },
            { rotateZ: `${crownRotate.value}deg` },
        ],
    }));

    return (
        <View style={{ flex: 1, alignItems: "center" }}>
            {isWinner ? (
                <Animated.View
                    style={[
                        {
                            marginBottom: 4,
                            shadowColor: "#fbbf24",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.8,
                            shadowRadius: 12,
                            elevation: 8,
                        },
                        crownStyle,
                    ]}
                >
                    <Ionicons name="trophy" size={28} color="#fbbf24" />
                </Animated.View>
            ) : (
                <View style={{ height: 32 }} />
            )}

            <Animated.View style={labelStyle}>
                <CountUpNumber
                    value={score}
                    duration={900}
                    delay={delay + 200}
                    style={{
                        color: isWinner ? "#fbbf24" : "#ffffff",
                        fontWeight: "900",
                        fontSize: 40,
                        textAlign: "center",
                    }}
                />
            </Animated.View>

            <Animated.View
                style={[
                    {
                        width: "75%",
                        borderTopLeftRadius: 18,
                        borderTopRightRadius: 18,
                        marginTop: 6,
                        overflow: "hidden",
                    },
                    barStyle,
                ]}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: color,
                        borderTopLeftRadius: 18,
                        borderTopRightRadius: 18,
                    }}
                />
                {isWinner && (
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "#ffffff",
                            opacity: 0.18,
                            borderTopLeftRadius: 18,
                            borderTopRightRadius: 18,
                        }}
                    />
                )}
            </Animated.View>

            <View
                style={{
                    width: "85%",
                    borderBottomLeftRadius: 14,
                    borderBottomRightRadius: 14,
                    backgroundColor: "rgba(15, 23, 42, 0.5)",
                    paddingVertical: 8,
                    paddingHorizontal: 6,
                }}
            >
                <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={{
                        color: "#ffffff",
                        textAlign: "center",
                        fontWeight: "900",
                        fontSize: 12,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                    }}
                >
                    {label}
                </Text>
            </View>
        </View>
    );
}

/**
 * Two-bar animated podium with winner highlighted by a crown and gold bar.
 * Bars grow with spring, numbers count up.
 */
export default function ScorePodium({
    teamAName,
    teamBName,
    scoreA,
    scoreB,
    winnerKey,
    startDelay = 0,
}) {
    const maxScore = Math.max(scoreA || 0, scoreB || 0, 1);

    return (
        <View
            style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                paddingHorizontal: 8,
            }}
        >
            <Bar
                label={teamAName || "Takım A"}
                score={scoreA}
                isWinner={winnerKey === "A"}
                color={winnerKey === "A" ? "#fbbf24" : "#a855f7"}
                delay={startDelay}
                maxScore={maxScore}
            />
            <View style={{ width: 16 }} />
            <Bar
                label={teamBName || "Takım B"}
                score={scoreB}
                isWinner={winnerKey === "B"}
                color={winnerKey === "B" ? "#fbbf24" : "#a855f7"}
                delay={startDelay + 180}
                maxScore={maxScore}
            />
        </View>
    );
}
