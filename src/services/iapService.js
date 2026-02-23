// src/services/iapService.js
import * as RNIap from "react-native-iap";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setPremium } from "./adService";

const REMOVE_ADS_KEY = "REMOVE_ADS_V1";
export const PRODUCT_IDS = ["tabu_reklamsiz"];

let purchaseUpdateSub = null;
let purchaseErrorSub = null;
let iapInited = false;
const processedTokens = new Set();
let busy = false;

// Yerel hafızadan reklam durumunu oku
export async function getLocalRemoveAds() {
    const v = await AsyncStorage.getItem(REMOVE_ADS_KEY);
    return v === "1";
}

// Reklam durumunu hem yerel hafızaya hem reklam servisine kaydet
export async function setLocalRemoveAds(enabled) {
    await AsyncStorage.setItem(REMOVE_ADS_KEY, enabled ? "1" : "0");
    try {
        await setPremium(!!enabled);
    } catch (err) {
        console.log("[IAP] AdService sync error:", err);
    }
}

// Market bağlantısını başlat ve dinleyicileri kur
export async function initIAP() {
    if (iapInited) return true;

    try {
        const ok = await RNIap.initConnection();
        console.log("[RN-IAP] Connection initialized:", ok);

        // Android'de bekleyen hatalı işlemleri temizle (Fonksiyon kontrolü ile)
        if (Platform.OS === 'android') {
            try {
                if (typeof RNIap.flushFailedPurchasesCachedAsPendingAndroid === 'function') {
                    await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
                }
            } catch (e) {
                console.log("[RN-IAP] Android flush skip or not supported");
            }
        }

        // Eski dinleyicileri temizle
        purchaseUpdateSub?.remove?.();
        purchaseErrorSub?.remove?.();

        // Satın alma başarılı olduğunda tetiklenir
        purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase) => {
            try {
                if (!purchase) return;

                const token =
                    purchase.purchaseToken ||
                    purchase.transactionId ||
                    purchase.originalTransactionIdentifierIOS;

                if (token && processedTokens.has(token)) return;
                if (token) processedTokens.add(token);

                if (purchase.productId === "tabu_reklamsiz") {
                    await setLocalRemoveAds(true);
                }

                // İşlemi market tarafında başarıyla sonlandır (Önemli)
                await RNIap.finishTransaction({ purchase, isConsumable: false });
            } catch (e) {
                console.log("[RN-IAP] purchaseUpdate error:", e.message);
            }
        });

        // Satın alma hatası olduğunda tetiklenir
        purchaseErrorSub = RNIap.purchaseErrorListener((err) => {
            console.log("[RN-IAP] purchaseError:", err?.message || err);
        });

        iapInited = true;
        return ok;
    } catch (e) {
        iapInited = false;
        console.log("[RN-IAP] initIAP connection error:", e.message);
        throw new Error("Market bağlantısı kurulamadı. Lütfen internetinizi kontrol edin.");
    }
}

// Marketten ürün bilgilerini (fiyat vb.) çek
export async function getProducts() {
    try {
        if (!iapInited) await initIAP();

        // v14+ için en güncel ürün çekme yöntemi
        const products = await RNIap.getProducts({ skus: PRODUCT_IDS });
        return products || [];
    } catch (e) {
        console.log("[RN-IAP] getProducts error:", e.message);
        return [];
    }
}

// Satın alma işlemini başlat
export async function buyRemoveAds() {
    if (busy) return false;
    busy = true;

    const sku = PRODUCT_IDS[0];
    try {
        if (!iapInited) await initIAP();

        // Hem iOS hem Android için ortak parametre yapısı
        await RNIap.requestPurchase({
            sku: sku,
            andoid: { skus: [sku] }, // Android için
            ios: {
                sku: sku,
                andIncludeIntermediateReceiptIOS: true
            } // iOS için
        });

        return true;
    } catch (e) {
        // Kullanıcı iptal ettiyse hata verme
        if (e?.code === 'E_USER_CANCELLED' || e?.message?.toLowerCase().includes('cancelled')) {
            return false;
        }
        throw new Error(e?.message || "Satın alma işlemi başlatılamadı.");
    } finally {
        busy = false;
    }
}

// Daha önce satın alınmış ürünleri geri yükle
export async function restoreRemoveAds() {
    try {
        if (!iapInited) await initIAP();

        // iOS'ta 'restorePurchases' kullanımı Apple politikaları gereği daha sağlıklıdır
        const purchases = Platform.OS === 'ios'
            ? await RNIap.restorePurchases()
            : await RNIap.getAvailablePurchases();

        const hasRemoveAds = (purchases || []).some(
            (p) => p.productId === "tabu_reklamsiz"
        );

        await setLocalRemoveAds(!!hasRemoveAds);
        return !!hasRemoveAds;
    } catch (e) {
        console.log("[RN-IAP] restore error:", e.message);
        throw new Error("Satın alımlarınız geri yüklenemedi. Lütfen daha sonra tekrar deneyin.");
    }
}

// Bağlantıyı kes (Uygulama kapanırken vb.)
export async function endIAP() {
    purchaseUpdateSub?.remove?.();
    purchaseErrorSub?.remove?.();
    processedTokens.clear();
    try {
        await RNIap.endConnection();
    } catch { }
    iapInited = false;
}