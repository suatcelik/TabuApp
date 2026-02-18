// src/services/iapService.js
import * as RNIap from "react-native-iap";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setPremium } from "./adService";

const REMOVE_ADS_KEY = "REMOVE_ADS_V1";
export const PRODUCT_IDS = ["tabu_reklamsiz"];

// Listener referansları
let purchaseUpdateSub = null;
let purchaseErrorSub = null;

// Init guard
let iapInited = false;

// Purchase event tekrarına karşı
const processedTokens = new Set();

// Basit concurrency guard
let busy = false;

// Local cache (UX için)
export async function getLocalRemoveAds() {
    const v = await AsyncStorage.getItem(REMOVE_ADS_KEY);
    return v === "1";
}

export async function setLocalRemoveAds(enabled) {
    await AsyncStorage.setItem(REMOVE_ADS_KEY, enabled ? "1" : "0");
    // ✅ Reklam tarafını da senkronla
    try {
        await setPremium(!!enabled);
    } catch { }
}

export async function initIAP() {
    if (iapInited) return true;

    try {
        const ok = await RNIap.initConnection();

        // Android için: pending cache temizle
        try {
            await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
        } catch {
            try {
                await RNIap.flushFailedPurchasesCachedAsPendingAndroid?.();
            } catch { }
        }

        // ✅ Listener'lar
        purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase) => {
            try {
                if (!purchase) return;

                const token =
                    purchase.purchaseToken ||
                    purchase.transactionId ||
                    purchase.originalTransactionIdentifierIOS;

                if (token && processedTokens.has(token)) return;
                if (token) processedTokens.add(token);

                const productId = purchase.productId;

                // ✅ DÜZELTME YAPILDI: "remove_ads" yerine "tabu_reklamsiz" kontrol ediliyor.
                if (productId === "tabu_reklamsiz") {
                    await setLocalRemoveAds(true);
                }

                // ✅ Finish / ACK
                try {
                    await RNIap.finishTransaction({ purchase, isConsumable: false });
                } catch (e1) {
                    try {
                        await RNIap.finishTransaction(purchase, false);
                    } catch (e2) {
                        console.log("[RN-IAP] finishTransaction failed:", e2?.message || e2);
                    }
                }
            } catch (e) {
                console.log("[RN-IAP] purchaseUpdatedListener error:", e?.message || e);
            }
        });

        purchaseErrorSub = RNIap.purchaseErrorListener((err) => {
            console.log("[RN-IAP] purchaseErrorListener:", err?.message || err);
        });

        iapInited = true;
        return ok;
    } catch (e) {
        console.log("[RN-IAP] initIAP error:", e?.message || e);
        iapInited = false;
        return false;
    }
}

export async function endIAP() {
    try {
        purchaseUpdateSub?.remove?.();
        purchaseErrorSub?.remove?.();
    } catch { }

    purchaseUpdateSub = null;
    purchaseErrorSub = null;
    processedTokens.clear();

    try {
        await RNIap.endConnection();
    } catch { }

    iapInited = false;
}

export async function getProducts() {
    try {
        if (!iapInited) await initIAP();

        if (typeof RNIap.fetchProducts === "function") {
            const res = await RNIap.fetchProducts({ skus: PRODUCT_IDS, type: "in-app" });
            return res?.products ?? res ?? [];
        }

        const products = await RNIap.getProducts({ skus: PRODUCT_IDS });
        return products || [];
    } catch (e) {
        console.log("[RN-IAP] getProducts error:", e?.message || e);
        return [];
    }
}

export async function buyRemoveAds() {
    if (busy) return false;
    busy = true;

    const sku = PRODUCT_IDS?.[0]; // "tabu_reklamsiz"
    if (!sku) {
        console.log("[RN-IAP] SKU missing");
        busy = false;
        return false;
    }

    try {
        if (!iapInited) await initIAP();

        await RNIap.requestPurchase({
            request: {
                apple: { sku },
                google: { skus: [sku] },
            },
            type: "in-app",
        });

        return true;
    } catch (e) {
        console.log("[RN-IAP] buyRemoveAds error:", e?.message || e);
        return false;
    } finally {
        busy = false;
    }
}

export async function restoreRemoveAds() {
    try {
        if (!iapInited) await initIAP();

        const purchases = await RNIap.getAvailablePurchases();
        const hasRemoveAds = (purchases || []).some(
            (p) => p.productId === "tabu_reklamsiz"
        );

        await setLocalRemoveAds(!!hasRemoveAds);
        return !!hasRemoveAds;
    } catch (e) {
        console.log("[RN-IAP] restoreRemoveAds error:", e?.message || e);
        const local = await getLocalRemoveAds();
        await setLocalRemoveAds(!!local);
        return !!local;
    }
}