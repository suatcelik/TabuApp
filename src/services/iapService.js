// src/services/iapService.js
import * as RNIap from "react-native-iap";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REMOVE_ADS_KEY = "REMOVE_ADS_V1";

// Google Play product id (Play Console’daki ile aynı olmalı)
export const PRODUCT_IDS = ["remove_ads"];

// Local cache (UX için). Asıl doğrulama restore ile yapılır.
export async function getLocalRemoveAds() {
    const v = await AsyncStorage.getItem(REMOVE_ADS_KEY);
    return v === "1";
}

export async function setLocalRemoveAds(enabled) {
    await AsyncStorage.setItem(REMOVE_ADS_KEY, enabled ? "1" : "0");
}

export async function initIAP() {
    await RNIap.initConnection();
    // Android için güvenli: cache temizle (bazı cihazlarda pending purchase sorunu)
    try {
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid?.();
    } catch { }
}

export async function endIAP() {
    try {
        await RNIap.endConnection();
    } catch { }
}

// Ürünleri çek (fiyat vs. UI’de göstermek istersen)
export async function getProducts() {
    return await RNIap.getProducts({ skus: PRODUCT_IDS });
}

// Satın alma başlat
export async function buyRemoveAds() {
    const purchase = await RNIap.requestPurchase({ sku: "remove_ads" });

    // Purchase tamamlandıysa, Android’de acknowledge/finish şart
    // react-native-iap: finishTransaction
    await RNIap.finishTransaction({ purchase, isConsumable: false });

    // Local flag (UX)
    await setLocalRemoveAds(true);

    return purchase;
}

// Restore / doğrulama (en kritik kısım)
export async function restoreRemoveAds() {
    // Google tarafındaki “sahip olunan satın alımları” getirir
    const purchases = await RNIap.getAvailablePurchases();

    const hasRemoveAds = purchases?.some((p) => p.productId === "remove_ads");

    await setLocalRemoveAds(!!hasRemoveAds);
    return !!hasRemoveAds;
}
