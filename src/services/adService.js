// src/services/adService.js
import AsyncStorage from "@react-native-async-storage/async-storage";
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

// 🔥 PROD ID
const PROD_INTERSTITIAL_ID = "ca-app-pub-7780845735147349/8291922826";
const FORCE_TEST_ADS = false;

const AD_UNIT_ID = FORCE_TEST_ADS
  ? TestIds.INTERSTITIAL
  : __DEV__
    ? TestIds.INTERSTITIAL
    : PROD_INTERSTITIAL_ID;

let interstitial = null;
let isLoaded = false;
let isLoading = false;
let isShowing = false;
let initialized = false;

// ✅ PERFORMANS DÜZELTMESİ:
// Başlangıç değeri 'null' olmalı. Böylece 'false' (ücretsiz üye) durumu ile
// 'henüz kontrol edilmedi' durumu birbirinden ayrılır.
let isPremiumCache = null;

// Kapanınca çalışacak tek seferlik fonksiyon
let onAdClosedAction = null;

export async function initAds() {
  // ✅ Cache kontrolü ile başla, Premium ise hiç SDK başlatma
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
  // ✅ BELLEKTEN KONTROL: Cache true ise (Premium) yüklemeyi durdur
  if (isPremiumCache === true) return;

  if (isLoaded || isLoading || isShowing) return;

  try {
    if (!interstitial) {
      interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        isLoaded = true;
        isLoading = false;
      });

      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        isLoaded = false;
        isLoading = false;
        isShowing = false;

        if (onAdClosedAction) {
          onAdClosedAction();
          onAdClosedAction = null;
        }

        preloadInterstitial();
      });

      interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        isLoaded = false;
        isLoading = false;
        isShowing = false;
        console.log("Ad Error:", error);
      });
    }

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
    console.log("Reklam sırası yaklaştı, önden yükleniyor...");
    preloadInterstitial();
  }
}

export async function checkAndShowAd(onClosed) {
  // Burası artık diske gitmez, direkt RAM'den okur (HIZLI)
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
      onAdClosedAction = onClosed;
      try {
        interstitial.show();
        return true;
      } catch (e) {
        isShowing = false;
        preloadInterstitial();
        return false;
      }
    } else {
      preloadInterstitial();
      return false;
    }
  } else {
    await AsyncStorage.setItem(AD_COUNTER_KEY, String(counter));
    return false;
  }
}

// ✅ KRİTİK GÜNCELLEME BURADA YAPILDI
async function isPremium() {
  // Eğer cache 'null' değilse (yani true VEYA false ise) direkt döndür.
  // Bu sayede ÜCRETSİZ kullanıcılar için de AsyncStorage'a gitmez.
  if (isPremiumCache !== null) return isPremiumCache;

  try {
    const v = await AsyncStorage.getItem(PREMIUM_KEY);
    // Değeri okuyup cache'e yazıyoruz
    isPremiumCache = (v === "true");
    return isPremiumCache;
  } catch {
    return false;
  }
}

export async function setPremium(value) {
  isPremiumCache = !!value; // Cache'i anında güncelle
  await AsyncStorage.setItem(PREMIUM_KEY, value ? "true" : "false");
}