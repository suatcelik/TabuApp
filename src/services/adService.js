// src/services/adService.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import mobileAds, {
  InterstitialAd,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

const TOTAL_GAMES_KEY = "TOTAL_GAMES_V1";
const AD_COUNTER_KEY = "AD_COUNTER_V1";
const PREMIUM_KEY = "IS_PREMIUM_V1";

const FREE_GAMES = 3;
const SHOW_EVERY = 3;

// =======================
// ✅ DOĞRU PROD ID'LER
// =======================
const PROD_INTERSTITIAL_ID = Platform.select({
  ios: "ca-app-pub-7780845735147349/7965333779",
  android: "ca-app-pub-7780845735147349/8291922826",
});

// Test kontrol
const FORCE_TEST_ADS = false;

const AD_UNIT_ID =
  FORCE_TEST_ADS || __DEV__
    ? TestIds.INTERSTITIAL
    : PROD_INTERSTITIAL_ID;

// State
let interstitial = null;
let isLoaded = false;
let isLoading = false;
let isShowing = false;
let initialized = false;
let isPremiumCache = null;
let onAdClosedAction = null;

let unsubLoaded = null;
let unsubClosed = null;
let unsubError = null;

function cleanupListeners() {
  unsubLoaded?.();
  unsubClosed?.();
  unsubError?.();
  unsubLoaded = unsubClosed = unsubError = null;
}

function resetState() {
  isLoaded = false;
  isLoading = false;
  isShowing = false;
}

function createInterstitial() {
  if (interstitial) return;

  interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true, // 🍎 Apple için güvenli
  });

  cleanupListeners();

  unsubLoaded = interstitial.addAdEventListener(
    AdEventType.LOADED,
    () => {
      isLoaded = true;
      isLoading = false;
    }
  );

  unsubClosed = interstitial.addAdEventListener(
    AdEventType.CLOSED,
    () => {
      resetState();

      if (onAdClosedAction) {
        const fn = onAdClosedAction;
        onAdClosedAction = null;
        fn();
      }

      preloadInterstitial();
    }
  );

  unsubError = interstitial.addAdEventListener(
    AdEventType.ERROR,
    (error) => {
      resetState();
      console.log("Ad Error:", error);
    }
  );
}

export async function initAds() {
  if (await isPremium()) return;

  if (initialized) return;
  initialized = true;

  try {
    await mobileAds().initialize();
    preloadInterstitial();
  } catch (e) {
    console.log("AdMob Init Error:", e);
  }
}

export function preloadInterstitial() {
  if (isPremiumCache === true) return;
  if (isLoaded || isLoading || isShowing) return;

  try {
    createInterstitial();
    isLoading = true;
    interstitial.load();
  } catch (e) {
    isLoading = false;
    console.log("Ad Load Exception:", e);
  }
}

export async function prepareNextGameAd() {
  if (await isPremium()) return;

  const totalRaw = await AsyncStorage.getItem(TOTAL_GAMES_KEY);
  const total = Number(totalRaw || 0);

  if (total < FREE_GAMES) return;

  const counterRaw = await AsyncStorage.getItem(AD_COUNTER_KEY);
  const counter = Number(counterRaw || 0);

  if (counter + 1 >= SHOW_EVERY && !isLoaded && !isLoading) {
    preloadInterstitial();
  }
}

export async function checkAndShowAd(onClosed) {
  if (await isPremium()) return false;

  const totalRaw = await AsyncStorage.getItem(TOTAL_GAMES_KEY);
  const total = Number(totalRaw || 0) + 1;
  await AsyncStorage.setItem(TOTAL_GAMES_KEY, String(total));

  if (total <= FREE_GAMES) {
    preloadInterstitial();
    return false;
  }

  const counterRaw = await AsyncStorage.getItem(AD_COUNTER_KEY);
  let counter = Number(counterRaw || 0) + 1;

  if (counter >= SHOW_EVERY) {
    await AsyncStorage.setItem(AD_COUNTER_KEY, "0");

    if (isLoaded && interstitial) {
      isShowing = true;
      onAdClosedAction = typeof onClosed === "function" ? onClosed : null;

      try {
        interstitial.show();
        return true;
      } catch {
        isShowing = false;
        onAdClosedAction = null;
        preloadInterstitial();
        return false;
      }
    }

    preloadInterstitial();
    return false;
  }

  await AsyncStorage.setItem(AD_COUNTER_KEY, String(counter));
  return false;
}

async function isPremium() {
  if (isPremiumCache !== null) return isPremiumCache;

  try {
    const v = await AsyncStorage.getItem(PREMIUM_KEY);
    isPremiumCache = v === "true";
    return isPremiumCache;
  } catch {
    isPremiumCache = false;
    return false;
  }
}

export async function setPremium(value) {
  isPremiumCache = !!value;
  await AsyncStorage.setItem(PREMIUM_KEY, value ? "true" : "false");

  if (isPremiumCache) {
    onAdClosedAction = null;
    resetState();
    cleanupListeners();
    interstitial = null;
  }
}