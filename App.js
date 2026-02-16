// App.js
import "./global.css";
import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import ErrorBoundary from "./src/components/ErrorBoundary";
import { initAds } from "./src/services/adService"; // ✅ eklendi

// Ekranların import yolları
import HomeScreen from "./src/screens/HomeScreen";
import GameScreen from "./src/screens/GameScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ResultScreen from "./src/screens/ResultScreen";
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen"; // ✅ EKLENDİ

const Stack = createNativeStackNavigator();

export default function App() {
  // ✅ ErrorBoundary reset için: komple app'i yeniden mount eder
  const [appKey, setAppKey] = React.useState(0);


  // ✅ Ads SDK init + preload
  React.useEffect(() => {
    initAds();
  }, []);

  return (
    <ErrorBoundary onReset={() => setAppKey((k) => k + 1)}>
      <GestureHandlerRootView style={{ flex: 1 }} key={appKey}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Game" component={GameScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Result" component={ResultScreen} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
