// App.js
import "./global.css";
import React, { useEffect, useState } from "react";
import { StatusBar, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";

import ErrorBoundary from "./src/components/ErrorBoundary";


import {
  initIAP,
  endIAP,
  restorePurchases,
  getLocalRemoveAds,
} from "./src/services/iapService";

// Ekranların import yolları
import HomeScreen from "./src/screens/HomeScreen";
import GameScreen from "./src/screens/GameScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ResultScreen from "./src/screens/ResultScreen";
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen";
import StoreScreen from "./src/screens/StoreScreen";

// Uygulama açıkken bile bildirimlerin yukarıdan düşmesini sağlar
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createNativeStackNavigator();

export default function App() {
  const [appKey, setAppKey] = useState(0);

  const setupDailyNotifications = async () => {
    // Android için zorunlu bildirim kanalı
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Genel Bildirimler',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // İzinleri kontrol et ve iste
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Kullanıcı izin vermediyse sessizce çık
    if (finalStatus !== 'granted') {
      return;
    }

    // Eski/Çiftlenmiş bildirimleri temizle
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 1. Bildirim: Her gün öğlen 12:00
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Tabu Zamanı! 🎭",
        body: "Arkadaşlarınla kelime dağarcığını test etmeye ne dersin? Oyuna dön!",
        sound: true,
      },
      trigger: {
        hour: 12,
        minute: 0,
        repeats: true,
      },
    });

    // 2. Bildirim: Her gün akşam 20:00
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Günün Yorgunluğunu At! 🎲",
        body: "Eğlenceye katıl, kelimeleri anlatırken tabulara dikkat et!",
        sound: true,
      },
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
      },
    });
  };

  useEffect(() => {
    let cancelled = false;

    // Uygulama açılır açılmaz günlük bildirimleri kur
    setupDailyNotifications();

    (async () => {
      try {
        await initIAP();

        let hasRemoveAds = false;
        try {
          hasRemoveAds = await restorePurchases();
        } catch (e) {
          hasRemoveAds = await getLocalRemoveAds();
        }
      } catch (e) {
        console.log("IAP Başlatma Hatası:", e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        endIAP();
      } catch { }
    };
  }, []);

  return (
    <ErrorBoundary onReset={() => setAppKey((k) => k + 1)}>
      <GestureHandlerRootView style={{ flex: 1 }} key={appKey}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar
              barStyle="dark-content"
              translucent
              backgroundColor="transparent"
            />

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
              <Stack.Screen name="Store" component={StoreScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}