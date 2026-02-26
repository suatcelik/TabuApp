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
import useGameStore from "../store/useGameStore";

const REMOVE_ADS_KEY = "REMOVE_ADS_V1";

export const PRODUCT_IDS = [
    "tabu_reklamsiz",
    "tabu_tema_paketi_1"
];

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

        purchaseUpdateSub?.remove?.();
        purchaseErrorSub?.remove?.();

        purchaseUpdateSub = purchaseUpdatedListener(async (purchase) => {
            try {
                if (!purchase) return;

                const token = purchase.purchaseToken || purchase.transactionId || purchase.originalTransactionIdentifierIOS;

                if (token && processedTokens.has(token)) return;
                if (token) processedTokens.add(token);

                // GÜNCELLENDİ: Hangi ürün satın alındıysa Zustand'ı güncelle
                if (purchase.productId === "tabu_reklamsiz") {
                    await setLocalRemoveAds(true);
                    useGameStore.getState().setPremiumStatus(true);
                } else if (purchase.productId === "tabu_tema_paketi_1") {
                    useGameStore.getState().unlockThemeBundle();
                }

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
        throw new Error("Market bağlantısı kurulamadı.");
    }
}

export async function getProducts() {
    try {
        if (!iapInited) await initIAP();
        const products = await fetchProducts({
            skus: PRODUCT_IDS,
            type: "in-app",
        });
        return products || [];
    } catch (e) {
        return [];
    }
}

export async function buyProduct(sku) {
    if (busy) return false;
    busy = true;

    try {
        if (!iapInited) await initIAP();
        await requestPurchase({
            request: {
                apple: { sku },
                google: { skus: [sku] },
            },
            type: "in-app",
        });
        return true;
    } catch (e) {
        const msg = (e?.message || "").toLowerCase();
        if (e?.code === "E_USER_CANCELLED" || msg.includes("cancel")) {
            return false;
        }
        throw new Error(e?.message || "Satın alma başlatılamadı.");
    } finally {
        busy = false;
    }
}

export const buyRemoveAds = () => buyProduct("tabu_reklamsiz");

export async function restorePurchases() {
    try {
        if (!iapInited) await initIAP();
        const purchases = await getAvailablePurchases();

        let hasRemoveAds = false;
        let hasThemeBundle = false;

        (purchases || []).forEach(p => {
            if (p.productId === "tabu_reklamsiz") {
                hasRemoveAds = true;
            } else if (p.productId === "tabu_tema_paketi_1") {
                hasThemeBundle = true;
            }
        });

        // GÜNCELLENDİ: Eski satın alımları Zustand'a yükle
        await setLocalRemoveAds(hasRemoveAds);
        useGameStore.getState().setPremiumStatus(hasRemoveAds);

        if (hasThemeBundle) {
            useGameStore.getState().unlockThemeBundle();
        }

        return hasRemoveAds;
    } catch (e) {
        throw new Error("Geri yükleme işlemi başarısız oldu.");
    }
}

export const restoreRemoveAds = restorePurchases;

export async function endIAP() {
    purchaseUpdateSub?.remove?.();
    purchaseErrorSub?.remove?.();
    processedTokens.clear();
    try {
        await endConnection();
    } catch (e) { }
    iapInited = false;
}