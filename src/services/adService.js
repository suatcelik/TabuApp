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
const FORCE_TEST_ADS = false;

const AD_UNIT_ID = FORCE_TEST_ADS
    ? TestIds.INTERSTITIAL
    : __DEV__
        ? TestIds.INTERSTITIAL
        : PROD_INTERSTITIAL_ID;

// ---- singleton state ----
let interstitial = null;

let isLoaded = false;
let isLoading = false;
let isShowing = false;

let initialized = false;
let lastLoadAttemptAt = 0;
let retryTimer = null;

let loadResolvers = [];

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
 * ✅ App açılışında 1 kere çağır (App.js useEffect içinde olduğu gibi)
 */
export async function initAds() {
    if (initialized) return;
    initialized = true;

    try {
        await mobileAds().initialize();
        preloadInterstitial();
    } catch (e) {
        console.log("AdMob Init Error:", e);
    }
}

/**
 * ✅ Tek interstitial instance + listener birikmez
 */
export function preloadInterstitial() {
    const now = Date.now();

    // çok sık çağrılmayı engelle (spike -> kasma)
    if (now - lastLoadAttemptAt < 800) return;
    lastLoadAttemptAt = now;

    if (isLoaded || isLoading || isShowing) return;

    try {
        if (!interstitial) {
            interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
                requestNonPersonalizedAdsOnly: true,
            });

            // listener'lar 1 kere bağlanır
            interstitial.addAdEventListener(AdEventType.LOADED, () => {
                isLoaded = true;
                isLoading = false;
                resolveLoadedWaiters(true);
            });

            interstitial.addAdEventListener(AdEventType.CLOSED, () => {
                isLoaded = false;
                isLoading = false;
                isShowing = false;
                preloadInterstitial(); // kapanınca yenisini hazırla
            });

            interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
                isLoaded = false;
                isLoading = false;
                isShowing = false;
                resolveLoadedWaiters(false);
                console.log("❌ Interstitial error:", error?.message ?? error);
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
 * ✅ UI'yi bloklamadan hazır olmasını beklemek isteyen yerler için
 * (ResultScreen'de await etmiyoruz)
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
 * ✅ Oyun bitince çağır:
 * - ilk 3 oyun reklamsız
 * - sonra her 3 maçta 1
 * - hazır değilse asla beklemez, sadece preload eder
 */
export async function maybeShowInterstitialAfterGame() {
    if (await isPremium()) return false;

    const totalRaw = await AsyncStorage.getItem(TOTAL_GAMES_KEY);
    const total = Number(totalRaw || 0) + 1;
    await AsyncStorage.setItem(TOTAL_GAMES_KEY, String(total));

    if (total <= FREE_GAMES) {
        preloadInterstitial();
        return false;
    }

    const counterRaw = await AsyncStorage.getItem(AD_COUNTER_KEY);
    const counter = Number(counterRaw || 0) + 1;

    if (counter >= SHOW_EVERY) {
        await AsyncStorage.setItem(AD_COUNTER_KEY, "0");

        if (!interstitial || !isLoaded || isLoading || isShowing) {
            preloadInterstitial();
            return false;
        }

        try {
            isShowing = true;

            // küçük gecikme: navigation / animasyon çakışmasın
            setTimeout(() => {
                try {
                    if (interstitial && isLoaded) {
                        interstitial.show();
                    } else {
                        isShowing = false;
                        preloadInterstitial();
                    }
                } catch (_) {
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