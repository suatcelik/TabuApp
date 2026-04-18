import "./global.css";
import React, { useEffect, useMemo, useState } from "react";
import { StatusBar, Platform, Linking } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ErrorBoundary from "./src/components/ErrorBoundary";
import CustomAlert from "./src/components/CustomAlert";

import {
  initIAP,
  endIAP,
  restorePurchases,
  getLocalRemoveAds,
} from "./src/services/iapService";

import HomeScreen from "./src/screens/HomeScreen";
import GameScreen from "./src/screens/GameScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ResultScreen from "./src/screens/ResultScreen";
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen";
import StoreScreen from "./src/screens/StoreScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import HowToPlayScreen from "./src/screens/HowToPlayScreen";
import LeaderboardScreen from "./src/screens/LeaderboardScreen";
import useGameStore from "./src/store/useGameStore";
import { getTheme } from "./src/theme/themes";
import { pickNoonMessage, pickEveningMessage } from "./src/services/notificationContent";
import { t } from "./src/i18n";
import LoadingScreen from "./src/components/LoadingScreen";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createNativeStackNavigator();

const STORE_URL = Platform.select({
  ios: "https://apps.apple.com/app/id6743347320",
  android: "https://play.google.com/store/apps/details?id=com.arcodiba.tabuapp",
});

const LAUNCH_COUNT_KEY = "APP_LAUNCH_COUNT_V1";
const REVIEW_ASKED_KEY = "REVIEW_ASKED_V1";
const REVIEW_THRESHOLD = 3;
const NOTIF_SCHEDULE_KEY = "NOTIF_SCHEDULE_V2";

export default function App() {
  const [appKey, setAppKey] = useState(0);
  const [alertConfig, setAlertConfig] = useState(null);

  const selectedTheme = useGameStore((s) => s.settings?.selectedTheme || "default");
  const hasSeenOnboarding = useGameStore((s) => s.hasSeenOnboarding);
  const hasHydrated = useGameStore((s) => s._hasHydrated);

  const themeTokens = useMemo(() => getTheme(selectedTheme), [selectedTheme]);

  const navigationTheme = useMemo(() => {
    const base = themeTokens.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: themeTokens.surfaceBg,
        card: themeTokens.navigationBg,
        text: themeTokens.text,
        border: themeTokens.border,
        primary: themeTokens.primaryBg,
      },
    };
  }, [themeTokens]);

  const requestRating = async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      } else {
        setAlertConfig({
          title: t("alerts.rateTitle"),
          message: t("alerts.rateMessage"),
          buttons: [
            { text: t("common.later"), style: "cancel" },
            {
              text: t("alerts.rate"),
              onPress: () => Linking.openURL(STORE_URL),
            },
          ]
        });
      }
    } catch (e) {
      console.log("[StoreReview] Hata:", e);
    }
  };

  const handleLaunchCount = async () => {
    try {
      const alreadyAsked = await AsyncStorage.getItem(REVIEW_ASKED_KEY);
      if (alreadyAsked === "1") return;

      const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
      const count = raw ? parseInt(raw, 10) + 1 : 1;
      await AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(count));

      if (count >= REVIEW_THRESHOLD) {
        await AsyncStorage.setItem(REVIEW_ASKED_KEY, "1");
        setTimeout(() => requestRating(), 1500);
      }
    } catch (e) {
      console.log("[StoreReview] Sayaç hatası:", e);
    }
  };

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

    // Reschedule daily messages once per calendar day so the copy stays fresh.
    const today = new Date().toDateString();
    const lastScheduled = await AsyncStorage.getItem(NOTIF_SCHEDULE_KEY);
    if (lastScheduled === today) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const alreadySetup = scheduled.some(
        (n) => n.identifier === 'tabu-noon' || n.identifier === 'tabu-evening'
      );
      if (alreadySetup) return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync('tabu-noon');
      await Notifications.cancelScheduledNotificationAsync('tabu-evening');
    } catch (_) { }

    const noon = pickNoonMessage();
    const evening = pickEveningMessage();

    await Notifications.scheduleNotificationAsync({
      identifier: 'tabu-noon',
      content: {
        title: noon.title,
        body: noon.body,
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
        title: evening.title,
        body: evening.body,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'tabu-daily' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });

    await AsyncStorage.setItem(NOTIF_SCHEDULE_KEY, today);
  };

  useEffect(() => {
    let cancelled = false;

    setupDailyNotifications();
    handleLaunchCount();

    if (Platform.OS === "ios") {
      (async () => {
        try {
          const { requestTrackingPermissionsAsync } = await import("expo-tracking-transparency");
          const { status } = await requestTrackingPermissionsAsync();
          console.log("[ATT] Tracking permission status:", status);
        } catch (e) {
          console.log("[ATT] İzin isteği hatası:", e);
        }
      })();
    }

    (async () => {
      try {
        await initIAP();
        try {
          await restorePurchases();
        } catch (e) {
          await getLocalRemoveAds();
        }
      } catch (e) { }
    })();

    return () => {
      cancelled = true;
      try {
        endIAP();
      } catch { }
    };
  }, []);

  const initialRoute = hasSeenOnboarding ? "Home" : "Onboarding";

  if (!hasHydrated) {
    return (
      <SafeAreaProvider>
        <LoadingScreen message="Tabu GO" />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary onReset={() => setAppKey((k) => k + 1)}>
      <GestureHandlerRootView style={{ flex: 1 }} key={appKey}>
        <SafeAreaProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar
              barStyle={themeTokens.statusBar}
              translucent
              backgroundColor="transparent"
            />

            <Stack.Navigator
              initialRouteName={initialRoute}
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: themeTokens.surfaceBg },
              }}
            >
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Game" component={GameScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Result" component={ResultScreen} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
              <Stack.Screen name="Store" component={StoreScreen} />
              <Stack.Screen name="HowToPlay" component={HowToPlayScreen} />
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            </Stack.Navigator>

            <CustomAlert
              visible={!!alertConfig}
              {...alertConfig}
              onClose={() => setAlertConfig(null)}
            />

          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
