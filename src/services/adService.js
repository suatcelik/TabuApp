// src/services/adService.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import mobileAds, {
  InterstitialAd,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

const PREMIUM_KEY = "REMOVE_ADS_V1";

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

  if (!isLoaded && !isLoading) {
    preloadInterstitial();
  }
}

export async function checkAndShowAd(onClosed) {
  if (await isPremium()) return false;

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

async function isPremium() {
  if (isPremiumCache !== null) return isPremiumCache;

  try {
    const v = await AsyncStorage.getItem(PREMIUM_KEY);
    // Artık REMOVE_ADS_KEY ile eşleştiği için değeri "1" veya "0" olarak okumalıyız
    isPremiumCache = (v === "1" || v === "true");
    return isPremiumCache;
  } catch {
    isPremiumCache = false;
    return false;
  }
}

export async function setPremium(value) {
  isPremiumCache = !!value;
  // iapService.js tarafında "1" ve "0" kullanıldığı için tutarlılık adına "1" ve "0" olarak yazıyoruz
  await AsyncStorage.setItem(PREMIUM_KEY, value ? "1" : "0");

  if (isPremiumCache) {
    onAdClosedAction = null;
    resetState();
    cleanupListeners();
    interstitial = null;
  }
}