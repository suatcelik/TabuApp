// src/services/adService.js
//
// Merkezi reklam yönetimi — Singleton InterstitialAd instance.
//
// Problem: GameScreen ve ResultScreen'de ayrı ayrı
//   InterstitialAd.createForAdRequest() çağrısı yapılıyordu.
// Aynı adUnitId ile iki farklı instance oluşunca event listener'lar
// çakışıyor, biri LOADED alırken diğeri CLOSED alıyordu.
//
// Çözüm: Instance burada tek sefer oluşturuluyor.
// Her ekran bu modülden abone olup kendi callback'lerini kaydeder,
// unmount'ta aboneliğini temizler — instance asla tekrar yaratılmaz.

import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// ─── Singleton Instance ───────────────────────────────────────────────────────

const adUnitId = __DEV__
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-7780845735147349/8291922826';

export const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
});

// ─── Yükleme ─────────────────────────────────────────────────────────────────

/**
 * Reklamı yükler. Zaten yükleniyorsa ya da yüklendiyse tekrar istek atmaz.
 * isPremium true ise hiçbir şey yapmaz.
 */
export const loadAd = (isPremium = false) => {
    if (isPremium) return;
    try {
        interstitial.load();
    } catch (_) { }
};

// ─── Abone Ol / Aboneliği Kaldır ─────────────────────────────────────────────

/**
 * Belirli bir AdEventType için listener kaydeder.
 * Dönen fonksiyon çağrıldığında aboneliği temizler (useEffect cleanup için).
 *
 * @param {AdEventType} eventType
 * @param {Function} callback
 * @returns {Function} unsubscribe
 */
export const subscribeAdEvent = (eventType, callback) => {
    return interstitial.addAdEventListener(eventType, callback);
};

// ─── Göster ──────────────────────────────────────────────────────────────────

/**
 * Reklam yüklendiyse gösterir, yüklenmediyse false döndürür.
 *
 * @returns {boolean} gösterim başlatıldı mı
 */
export const showAd = () => {
    try {
        interstitial.show();
        return true;
    } catch (_) {
        return false;
    }
};

export { AdEventType };