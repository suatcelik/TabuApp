// src/components/ErrorBoundary.js
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default class ErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        // İleride buraya Sentry/Crashlytics bağlanabilir.
        // Şimdilik boş bırakıyoruz (production console temizlenecek).
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>
                    Bir şeyler ters gitti
                </Text>
                <Text style={{ opacity: 0.7, marginBottom: 16, textAlign: "center" }}>
                    Uygulama güvenli moda geçti. Yeniden başlatmayı deneyebilirsin.
                </Text>

                <TouchableOpacity
                    style={{
                        height: 48,
                        paddingHorizontal: 18,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#0e7490",
                    }}
                    onPress={() => {
                        this.setState({ hasError: false });
                        this.props.onReset?.();
                    }}
                >
                    <Text style={{ color: "white", fontWeight: "800" }}>Yeniden Başlat</Text>
                </TouchableOpacity>
            </View>
        );
    }
}
