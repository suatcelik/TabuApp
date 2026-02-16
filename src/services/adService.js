// src/services/adService.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import mobileAds, { InterstitialAd, AdEventType, TestIds } from "react-native-google-mobile-ads";

const TOTAL_GAMES_KEY = "TOTAL_GAMES_V1";
const AD_COUNTER_KEY = "AD_COUNTER_V1";
const PREMIUM_KEY = "IS_PREMIUM_V1";

const FREE_GAMES = 3; // İlk 3 oyun reklamsız
const SHOW_EVERY = 3; // Sonra 3 maçta 1

// 🔥 PROD ID
const PROD_INTERSTITIAL_ID = "ca-app-pub-7780845735147349/8291922826";

// ✅ Yeni AdMob hesabında gerçek reklam hemen dolmayabilir.
// Preview'da kesin görmek için bunu geçici TRUE yapabilirsin.
const FORCE_TEST_ADS = false;

// 🔧 Ad unit seçimi
const AD_UNIT_ID = FORCE_TEST_ADS ? TestIds.INTERSTITIAL : (__DEV__ ? TestIds.INTERSTITIAL : PROD_INTERSTITIAL_ID);

let interstitial = null;
let isLoaded = false;
let isLoading = false;
let listenersBound = false;

let loadResolvers = []; // loaded bekleyenler

const resolveLoadedWaiters = (value) => {
    const arr = loadResolvers;
    loadResolvers = [];
    arr.forEach((fn) => fn(value));
};

export async function initAds() {
    try {
        await mobileAds().initialize();
    } catch (_) { }

    // ilk preload
    preloadInterstitial();
}

export function preloadInterstitial() {
    // Zaten hazırsa / yükleniyorsa tekrar uğraşma
    if (isLoaded || isLoading) return;

    // Instance yoksa oluştur
    if (!interstitial) {
        interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
            requestNonPersonalizedAdsOnly: true,
        });
    }

    // Listener'ları sadece 1 kere bağla
    if (!listenersBound) {
        listenersBound = true;

        interstitial.addAdEventListener(AdEventType.LOADED, () => {
            isLoaded = true;
            isLoading = false;
            resolveLoadedWaiters(true);
        });

        interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            // kapanınca bir sonraki için tekrar yükle
            isLoaded = false;
            isLoading = false;
            preloadInterstitial();
        });

        interstitial.addAdEventListener(AdEventType.ERROR, () => {
            isLoaded = false;
            isLoading = false;
            resolveLoadedWaiters(false);
            // Biraz sonra tekrar preload dene
            // (Burada setTimeout kullanmıyoruz; çağıranlar tekrar çağırabilir)
        });
    }

    // Load
    isLoading = true;
    try {
        interstitial.load();
    } catch (_) {
        isLoading = false;
    }
}

// ✅ ResultScreen'de "max 1200ms bekle" için yardımcı
export async function waitForAdLoaded(maxMs = 1200) {
    if (isLoaded) return true;

    preloadInterstitial();

    return await new Promise((resolve) => {
        const t = setTimeout(() => resolve(false), maxMs);
        loadResolvers.push((ok) => {
            clearTimeout(t);
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

    // 1) toplam oyun sayısı
    const totalRaw = await AsyncStorage.getItem(TOTAL_GAMES_KEY);
    const total = Number(totalRaw || 0) + 1;
    await AsyncStorage.setItem(TOTAL_GAMES_KEY, String(total));

    // İlk 3 oyun reklamsız
    if (total <= FREE_GAMES) return false;

    // 2) reklam sayacı
    const counterRaw = await AsyncStorage.getItem(AD_COUNTER_KEY);
    const counter = Number(counterRaw || 0) + 1;

    if (counter >= SHOW_EVERY) {
        await AsyncStorage.setItem(AD_COUNTER_KEY, "0");

        // Hazırsa göster
        if (interstitial && isLoaded) {
            try {
                interstitial.show();
                return true;
            } catch (_) {
                // show patlarsa yeniden hazırla
                isLoaded = false;
                isLoading = false;
                preloadInterstitial();
                return false;
            }
        }

        // Hazır değilse hazırla ama akışı bozma
        preloadInterstitial();
        return false;
    }

    await AsyncStorage.setItem(AD_COUNTER_KEY, String(counter));
    return false;
}

export async function setPremium(value) {
    await AsyncStorage.setItem(PREMIUM_KEY, value ? "true" : "false");
}

// (opsiyonel) test için sayaçları sıfırla
export async function resetAdCounters() {
    await AsyncStorage.multiRemove([TOTAL_GAMES_KEY, AD_COUNTER_KEY]);
}
