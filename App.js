// App.js
import "./global.css";
import React, { useEffect, useState } from "react";
import { StatusBar, Platform, Linking, Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Mağaza linkleri (App Store ID'ni kendi ID'nle güncelle)
const STORE_URL = Platform.select({
  ios: "https://apps.apple.com/app/id6743347320",
  android: "https://play.google.com/store/apps/details?id=com.arcodiba.tabuapp",
});

const LAUNCH_COUNT_KEY = "APP_LAUNCH_COUNT_V1";
const REVIEW_ASKED_KEY = "REVIEW_ASKED_V1";
const REVIEW_THRESHOLD = 3; // 3. açılışta sor

// Rating isteği: önce native, olmadı mağaza linkine yönlendir
const requestRating = async () => {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();

    if (isAvailable) {
      await StoreReview.requestReview();
    } else {
      // Native review mevcut değilse mağaza linkine yönlendir
      Alert.alert(
        "Bizi Değerlendir ⭐",
        "Tabu GO'yu beğendiysen mağazada yıldız verirsen çok mutlu oluruz!",
        [
          { text: "Daha Sonra", style: "cancel" },
          {
            text: "Değerlendir 🎉",
            onPress: () => Linking.openURL(STORE_URL),
          },
        ]
      );
    }
  } catch (e) {
    console.log("[StoreReview] Hata:", e);
  }
};

// Açılış sayacını artır ve gerekirse rating iste
const handleLaunchCount = async () => {
  try {
    // Daha önce sorulduysa bir daha sorma
    const alreadyAsked = await AsyncStorage.getItem(REVIEW_ASKED_KEY);
    if (alreadyAsked === "1") return;

    const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    await AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(count));

    console.log(`[StoreReview] Açılış sayısı: ${count}`);

    if (count >= REVIEW_THRESHOLD) {
      await AsyncStorage.setItem(REVIEW_ASKED_KEY, "1");
      // Kısa gecikme: uygulama tam yüklendikten sonra göster
      setTimeout(() => requestRating(), 1500);
    }
  } catch (e) {
    console.log("[StoreReview] Sayaç hatası:", e);
  }
};

export default function App() {
  const [appKey, setAppKey] = useState(0);

  const setupDailyNotifications = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('tabu-daily', {
        name: 'Günlük Hatırlatmalar',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const alreadySetup = scheduled.some(
      (n) => n.identifier === 'tabu-noon' || n.identifier === 'tabu-evening'
    );
    if (alreadySetup) return;

    await Notifications.scheduleNotificationAsync({
      identifier: 'tabu-noon',
      content: {
        title: "Tabu Zamanı! 🎭",
        body: "Arkadaşlarınla kelime dağarcığını test etmeye ne dersin? Oyuna dön!",
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'tabu-daily' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 12,
        minute: 0,
      },
    });

    await Notifications.scheduleNotificationAsync({
      identifier: 'tabu-evening',
      content: {
        title: "Günün Yorgunluğunu At! 🎲",
        body: "Eğlenceye katıl, kelimeleri anlatırken tabulara dikkat et!",
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'tabu-daily' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });

    console.log('[Notifications] Günlük bildirimler kuruldu.');
  };

  useEffect(() => {
    let cancelled = false;

    setupDailyNotifications();
    handleLaunchCount();

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