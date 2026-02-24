// src/services/iapService.js
import {
    initConnection,
    endConnection,
    fetchProducts,
    requestPurchase,
    getAvailablePurchases,
    purchaseUpdatedListener,
    purchaseErrorListener,
    finishTransaction,
    flushFailedPurchasesCachedAsPendingAndroid,
} from "react-native-iap";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setPremium } from "./adService";

const REMOVE_ADS_KEY = "REMOVE_ADS_V1";
export const PRODUCT_IDS = ["tabu_reklamsiz"]; // non-consumable (remove ads)

let purchaseUpdateSub = null;
let purchaseErrorSub = null;
let iapInited = false;
const processedTokens = new Set();
let busy = false;

export async function getLocalRemoveAds() {
    const v = await AsyncStorage.getItem(REMOVE_ADS_KEY);
    return v === "1";
}

export async function setLocalRemoveAds(enabled) {
    await AsyncStorage.setItem(REMOVE_ADS_KEY, enabled ? "1" : "0");
    try {
        await setPremium(!!enabled);
    } catch (err) {
        console.log("[IAP] AdService sync error:", err);
    }
}

export async function initIAP() {
    if (iapInited) return true;

    try {
        const ok = await initConnection();
        console.log("[RN-IAP] Connection initialized:", ok);

        if (Platform.OS === "android") {
            try {
                if (typeof flushFailedPurchasesCachedAsPendingAndroid === "function") {
                    await flushFailedPurchasesCachedAsPendingAndroid();
                }
            } catch (e) {
                console.log("[RN-IAP] Android flush skip:", e?.message || e);
            }
        }

        // remove old listeners if any
        purchaseUpdateSub?.remove?.();
        purchaseErrorSub?.remove?.();

        purchaseUpdateSub = purchaseUpdatedListener(async (purchase) => {
            try {
                if (!purchase) return;

                const token =
                    purchase.purchaseToken ||
                    purchase.transactionId ||
                    purchase.originalTransactionIdentifierIOS;

                // de-dupe within app session
                if (token && processedTokens.has(token)) return;
                if (token) processedTokens.add(token);

                if (purchase.productId === PRODUCT_IDS[0]) {
                    await setLocalRemoveAds(true);
                }

                // non-consumable
                await finishTransaction({ purchase, isConsumable: false });
            } catch (e) {
                console.log("[RN-IAP] purchaseUpdate error:", e?.message || e);
            }
        });

        purchaseErrorSub = purchaseErrorListener((err) => {
            console.log("[RN-IAP] purchaseError:", err?.message || err);
        });

        iapInited = true;
        return ok;
    } catch (e) {
        iapInited = false;
        console.log("[RN-IAP] initIAP connection error:", e?.message || e);
        throw new Error("Market bağlantısı kurulamadı.");
    }
}

export async function getProducts() {
    try {
        if (!iapInited) await initIAP();

        // v14 unified API
        const products = await fetchProducts({
            skus: PRODUCT_IDS,
            type: "in-app", // non-consumable / in-app product
        });

        console.log("[RN-IAP] Products fetched:", products?.length || 0);
        return products || [];
    } catch (e) {
        console.log("[RN-IAP] getProducts error:", e?.message || e);
        return [];
    }
}

export async function buyRemoveAds() {
    if (busy) return false;
    busy = true;

    const sku = PRODUCT_IDS[0];

    try {
        if (!iapInited) await initIAP();

        // v14 unified API
        await requestPurchase({
            request: {
                apple: { sku },
                google: { skus: [sku] },
            },
            type: "in-app",
        });

        return true;
    } catch (e) {
        // user cancelled
        const msg = (e?.message || "").toLowerCase();
        if (e?.code === "E_USER_CANCELLED" || msg.includes("cancel")) {
            return false;
        }
        throw new Error(e?.message || "Satın alma başlatılamadı.");
    } finally {
        busy = false;
    }
}

export async function restoreRemoveAds() {
    try {
        if (!iapInited) await initIAP();

        // v14: use getAvailablePurchases on both iOS/Android
        const purchases = await getAvailablePurchases();

        const hasRemoveAds = (purchases || []).some(
            (p) => p.productId === PRODUCT_IDS[0]
        );

        await setLocalRemoveAds(!!hasRemoveAds);
        return !!hasRemoveAds;
    } catch (e) {
        console.log("[RN-IAP] restore error:", e?.message || e);
        throw new Error("Geri yükleme işlemi başarısız oldu.");
    }
}

export async function endIAP() {
    purchaseUpdateSub?.remove?.();
    purchaseErrorSub?.remove?.();
    processedTokens.clear();

    try {
        await endConnection();
    } catch (e) {
        // ignore
    }

    iapInited = false;
}