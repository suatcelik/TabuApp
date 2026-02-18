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

const FREE_GAMES = 3; // İlk 3 oyun reklamsız
const SHOW_EVERY = 3; // Sonra her 3 maçta 1

// 🔥 PROD ID
const PROD_INTERSTITIAL_ID = "ca-app-pub-7780845735147349/8291922826";

// İstersen prod’da bile test reklamı basmak için:
const FORCE_TEST_ADS = false;

const AD_UNIT_ID = FORCE_TEST_ADS
  ? TestIds.INTERSTITIAL
  : __DEV__
  ? TestIds.INTERSTITIAL
  : PROD_INTERSTITIAL_ID;

// ---- Internal state (singleton) ----
let interstitial = null;

let isLoaded = false;
let isLoading = false;
let isShowing = false;

let loadResolvers = [];
let initialized = false;
let lastLoadAttemptAt = 0;
let retryTimer = null;

const resolveLoadedWaiters = (value) => {
  const arr = [...loadResolvers];
  loadResolvers = [];
  arr.forEach((fn) => fn(!!value));
};

const clearRetryTimer = () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

const scheduleRetry = (ms) => {
  clearRetryTimer();
  retryTimer = setTimeout(() => {
    preloadInterstitial();
  }, ms);
};

async function isPremium() {
  try {
    const v = await AsyncStorage.getItem(PREMIUM_KEY);
    return v === "true";
  } catch {
    return false;
  }
}

/**
 * ✅ Uygulama açılışında bir kere çağır
 */
export async function initAds() {
  if (initialized) return;
  initialized = true;

  try {
    await mobileAds().initialize();
    preloadInterstitial(); // ilk preload
  } catch (e) {
    console.log("AdMob Init Error:", e);
  }
}

/**
 * ✅ Interstitial tek instance + tek listener seti
 * - Eğer instance yoksa oluşturur
 * - Varsa tekrar yaratmaz, sadece load() eder
 */
export function preloadInterstitial() {
  // Çok sık çağrılmayı sakinleştir
  const now = Date.now();
  if (now - lastLoadAttemptAt < 800) return; // 0.8sn throttle
  lastLoadAttemptAt = now;

  if (isLoaded || isLoading || isShowing) return;

  try {
    if (!interstitial) {
      interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      // ✅ Listener’lar SADECE 1 kere bağlanır
      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        isLoaded = true;
        isLoading = false;
        resolveLoadedWaiters(true);
        // console.log("✅ Interstitial loaded");
      });

      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        isLoaded = false;
        isLoading = false;
        isShowing = false;
        // console.log("🔄 Interstitial closed -> preload next");
        // Reklam kapanınca bir sonrakini hazırla
        preloadInterstitial();
      });

      interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        isLoaded = false;
        isLoading = false;
        isShowing = false;
        resolveLoadedWaiters(false);
        console.log("❌ Interstitial error:", error?.message ?? error);

        // ✅ Daha makul retry (15s yerine küçük backoff)
        // İlk deneme 5s, sonra 15s
        scheduleRetry(5000);
      });
    }

    isLoading = true;
    clearRetryTimer();
    interstitial.load();
  } catch (e) {
    isLoaded = false;
    isLoading = false;
    isShowing = false;
    resolveLoadedWaiters(false);
    console.log("preloadInterstitial exception:", e);
    scheduleRetry(8000);
  }
}

/**
 * ✅ UI'yi bloklamadan "hazır mı?" beklemek isteyen yerler için.
 * ResultScreen'de await etmeni önermiyorum.
 */
export async function waitForAdLoaded(maxMs = 1500) {
  if (isLoaded) return true;

  preloadInterstitial();

  return await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), maxMs);

    loadResolvers.push((ok) => {
      clearTimeout(timeout);
      resolve(!!ok);
    });
  });
}

/**
 * ✅ Oyun bitince çağır.
 * - ilk FREE_GAMES reklamsız
 * - sonra SHOW_EVERY maçta 1 reklam
 * - show asla "bekleyerek" yapılmaz; hazırsa gösterilir.
 */
export async function maybeShowInterstitialAfterGame() {
  if (await isPremium()) return false;

  // toplam oyun sayısı
  const totalRaw = await AsyncStorage.getItem(TOTAL_GAMES_KEY);
  const total = Number(totalRaw || 0) + 1;
  await AsyncStorage.setItem(TOTAL_GAMES_KEY, String(total));

  if (total <= FREE_GAMES) {
    // console.log(`Free games left: ${FREE_GAMES - total}`);
    // Yine de arka planda yüklemeye devam et
    preloadInterstitial();
    return false;
  }

  // reklam sayacı
  const counterRaw = await AsyncStorage.getItem(AD_COUNTER_KEY);
  const counter = Number(counterRaw || 0) + 1;

  if (counter >= SHOW_EVERY) {
    // Sayaç sıfırla (bu oyun reklam hakkı)
    await AsyncStorage.setItem(AD_COUNTER_KEY, "0");

    // Hazır değilse gösterme, sadece preload et
    if (!interstitial || !isLoaded || isLoading || isShowing) {
      // console.log("Interstitial not ready, skipping show");
      preloadInterstitial();
      return false;
    }

    try {
      // ✅ Show state: tekrarlı show / çakışmayı engelle
      isShowing = true;

      // ✅ Ekran geçişine nefes ver (küçük gecikme)
      // Not: Bu gecikme UI'de "donma" yaratmaz çünkü show arka tarafta tetikleniyor olmalı
      setTimeout(() => {
        try {
          if (interstitial && isLoaded) {
            interstitial.show();
          } else {
            isShowing = false;
            preloadInterstitial();
          }
        } catch (e) {
          isShowing = false;
          preloadInterstitial();
        }
      }, 300);

      return true;
    } catch (e) {
      console.log("Show Error:", e);
      isShowing = false;
      preloadInterstitial();
      return false;
    }
  }

  await AsyncStorage.setItem(AD_COUNTER_KEY, String(counter));
  preloadInterstitial();
  return false;
}

export async function setPremium(value) {
  await AsyncStorage.setItem(PREMIUM_KEY, value ? "true" : "false");
}

export async function resetAdCounters() {
  await AsyncStorage.multiRemove([TOTAL_GAMES_KEY, AD_COUNTER_KEY]);
}