import AsyncStorage from "@react-native-async-storage/async-storage";
import mobileAds, {
  InterstitialAd,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

const TOTAL_GAMES_KEY = "TOTAL_GAMES_V1";
const AD_COUNTER_KEY = "AD_COUNTER_V1";
const PREMIUM_KEY = "IS_PREMIUM_V1";

const FREE_GAMES = 3;
const SHOW_EVERY = 3;

// 🔥 PROD ID
const PROD_INTERSTITIAL_ID = "ca-app-pub-7780845735147349/8291922826";
const FORCE_TEST_ADS = false; // Testleri bitirip Production'a geçerken false yapın

const AD_UNIT_ID = FORCE_TEST_ADS
  ? TestIds.INTERSTITIAL
  : __DEV__
    ? TestIds.INTERSTITIAL
    : PROD_INTERSTITIAL_ID;

let interstitial = null;
let isLoaded = false;
let isLoading = false;
let isShowing = false;
let initialized = false;

// Kapanınca çalışacak tek seferlik fonksiyon (Navigasyon için)
let onAdClosedAction = null;

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

export function preloadInterstitial() {
  if (isLoaded || isLoading || isShowing) return;

  try {
    if (!interstitial) {
      interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        isLoaded = true;
        isLoading = false;
      });

      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        isLoaded = false;
        isLoading = false;
        isShowing = false;

        // ✅ Eğer bir aksiyon tanımlıysa (Navigasyon gibi) çalıştır
        if (onAdClosedAction) {
          onAdClosedAction();
          onAdClosedAction = null;
        }

        // Bir sonraki için hemen yükle
        preloadInterstitial();
      });

      interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        isLoaded = false;
        isLoading = false;
        isShowing = false;
        console.log("Ad Error:", error);
      });
    }

    isLoading = true;
    interstitial.load();
  } catch (e) {
    isLoading = false;
    console.log("Ad Load Exception:", e);
  }
}

// ✅ YENİ: Result ekranı açılır açılmaz çağrılacak.
// Sayaçları kontrol eder, reklam sırası geldiyse ve yüklü değilse yüklemeyi zorlar.
export async function prepareNextGameAd() {
  if (await isPremium()) return;

  const totalRaw = await AsyncStorage.getItem(TOTAL_GAMES_KEY);
  const total = Number(totalRaw || 0);

  // Henüz ücretsiz oyunlardaysa veya reklam loaded ise işlem yapma
  if (total < FREE_GAMES) return;

  const counterRaw = await AsyncStorage.getItem(AD_COUNTER_KEY);
  const counter = Number(counterRaw || 0);

  // Sıradaki oyun reklamlı olacaksa ve reklam hazır değilse yükle
  if (counter + 1 >= SHOW_EVERY && !isLoaded && !isLoading) {
    console.log("Reklam sırası yaklaştı, önden yükleniyor...");
    preloadInterstitial();
  }
}

// ✅ YENİ: Butona basılınca çağrılacak.
// true dönerse UI bekler (reklam girecek), false dönerse direkt geçiş yapılır.
export async function checkAndShowAd(onClosed) {
  if (await isPremium()) return false;

  // 1) Toplam oyun sayısını güncelle
  const totalRaw = await AsyncStorage.getItem(TOTAL_GAMES_KEY);
  const total = Number(totalRaw || 0) + 1;
  await AsyncStorage.setItem(TOTAL_GAMES_KEY, String(total));

  if (total <= FREE_GAMES) {
    preloadInterstitial(); // Arka planda hazırla
    return false; // Reklam gösterme
  }

  // 2) Sayaç kontrolü
  const counterRaw = await AsyncStorage.getItem(AD_COUNTER_KEY);
  let counter = Number(counterRaw || 0) + 1;

  if (counter >= SHOW_EVERY) {
    // Reklam zamanı!
    await AsyncStorage.setItem(AD_COUNTER_KEY, "0");

    if (isLoaded && interstitial) {
      isShowing = true;
      onAdClosedAction = onClosed; // Kapanınca ne yapacağını kaydet
      try {
        interstitial.show();
        return true; // Reklam gösterildi, bekle
      } catch (e) {
        isShowing = false;
        preloadInterstitial();
        return false; // Hata oldu, bekleme yapma
      }
    } else {
      // Reklam sırasıydı ama yüklenememiş, pas geç
      preloadInterstitial();
      return false;
    }
  } else {
    // Henüz sıra gelmedi
    await AsyncStorage.setItem(AD_COUNTER_KEY, String(counter));
    return false;
  }
}

async function isPremium() {
  try {
    const v = await AsyncStorage.getItem(PREMIUM_KEY);
    return v === "true";
  } catch { return false; }
}

export async function setPremium(value) {
  await AsyncStorage.setItem(PREMIUM_KEY, value ? "true" : "false");
}