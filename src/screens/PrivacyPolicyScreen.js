import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIVACY_URL = "https://suatcelik.github.io/tabu-privacy-policy/";

export default function PrivacyPolicyScreen({ navigation }) {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <Ionicons name="arrow-back" size={26} color="#4f46e5" />
                </TouchableOpacity>
                <Text style={{ marginLeft: 12, fontSize: 18, fontWeight: "800", color: "#0f172a" }}>
                    Gizlilik Politikası
                </Text>
            </View>

            <WebView source={{ uri: PRIVACY_URL }} startInLoadingState />
        </SafeAreaView>
    );
}
