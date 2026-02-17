import AsyncStorage from "@react-native-async-storage/async-storage";
import mobileAds, { InterstitialAd, AdEventType, TestIds } from "react-native-google-mobile-ads";

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
    : (__DEV__ ? TestIds.INTERSTITIAL : PROD_INTERSTITIAL_ID);

let interstitial = null;
let isLoaded = false;
let isLoading = false;
let loadResolvers = [];

const resolveLoadedWaiters = (value) => {
    const arr = [...loadResolvers];
    loadResolvers = [];
    arr.forEach((fn) => fn(value));
};

export async function initAds() {
    try {
        await mobileAds().initialize();
        preloadInterstitial();
    } catch (e) {
        console.log("AdMob Init Error: ", e);
    }
}

export function preloadInterstitial() {
    if (isLoaded || isLoading) return;

    if (interstitial) {
        try {
            interstitial.removeAllListeners();
            interstitial = null;
        } catch (e) {
            console.log("Cleanup error:", e);
        }
    }

    interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
    });

    isLoading = true;

    interstitial.addAdEventListener(AdEventType.LOADED, () => {
        isLoaded = true;
        isLoading = false;
        resolveLoadedWaiters(true);
        console.log("✅ Reklam yüklendi ve hazır.");
    });

    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        isLoaded = false;
        isLoading = false;
        console.log("🔄 Reklam kapatıldı, yenisi hazırlanıyor...");
        preloadInterstitial();
    });

    interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        isLoaded = false;
        isLoading = false;
        resolveLoadedWaiters(false);
        console.log("❌ Reklam hatası: ", error.message);
        setTimeout(() => preloadInterstitial(), 15000);
    });

    interstitial.load();
}

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

async function isPremium() {
    try {
        const v = await AsyncStorage.getItem(PREMIUM_KEY);
        return v === "true";
    } catch {
        return false;
    }
}

export async function maybeShowInterstitialAfterGame() {
    if (await isPremium()) return false;

    const totalRaw = await AsyncStorage.getItem(TOTAL_GAMES_KEY);
    const total = Number(totalRaw || 0) + 1;
    await AsyncStorage.setItem(TOTAL_GAMES_KEY, String(total));

    if (total <= FREE_GAMES) {
        console.log(`İlk oyunlar... Kalan reklamsız: ${FREE_GAMES - total}`);
        return false;
    }

    const counterRaw = await AsyncStorage.getItem(AD_COUNTER_KEY);
    const counter = Number(counterRaw || 0) + 1;

    if (counter >= SHOW_EVERY) {
        if (interstitial && isLoaded) {
            try {
                // Sayacı sıfırla
                await AsyncStorage.setItem(AD_COUNTER_KEY, "0");

                // 🔥 PERFORMANS GÜNCELLEMESİ: 
                // Reklamı 600ms geciktirerek ekran geçiş animasyonuna yer açıyoruz.
                setTimeout(() => {
                    if (interstitial && isLoaded) {
                        interstitial.show();
                    }
                }, 600);

                return true;
            } catch (e) {
                console.log("Show Error: ", e);
                preloadInterstitial();
                return false;
            }
        } else {
            console.log("Reklam henüz hazır değil.");
            preloadInterstitial();
            return false;
        }
    }

    await AsyncStorage.setItem(AD_COUNTER_KEY, String(counter));
    console.log(`Reklam sayacı: ${counter}/${SHOW_EVERY}`);
    return false;
}

export async function setPremium(value) {
    await AsyncStorage.setItem(PREMIUM_KEY, value ? "true" : "false");
}

export async function resetAdCounters() {
    await AsyncStorage.multiRemove([TOTAL_GAMES_KEY, AD_COUNTER_KEY]);
}