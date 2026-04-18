import { I18n } from "i18n-js";
import * as Localization from "expo-localization";
import tr from "./tr";
import en from "./en";

export const SUPPORTED_LOCALES = ["tr", "en"];

export const i18n = new I18n({ tr, en });
i18n.defaultLocale = "tr";
i18n.enableFallback = true;

/**
 * Determine the best locale the app should start with.
 * Order:
 *   1. Explicit user pick (stored in Zustand settings.language)
 *   2. Device locale if supported
 *   3. Fallback to "tr"
 */
export const detectLocale = (preferred) => {
    if (preferred && SUPPORTED_LOCALES.includes(preferred)) {
        return preferred;
    }
    try {
        const getLocales = typeof Localization?.getLocales === "function"
            ? Localization.getLocales
            : null;
        const languageTag = getLocales
            ? getLocales()?.[0]?.languageTag
            : Localization.locale;

        if (typeof languageTag === "string") {
            const base = languageTag.split("-")[0];
            if (SUPPORTED_LOCALES.includes(base)) return base;
        }
    } catch (_) { }
    return "tr";
};

export const setLocale = (locale) => {
    i18n.locale = detectLocale(locale);
};

// Initialize at module load to avoid a flash of untranslated copy.
setLocale();

/**
 * Translate helper with simple {var} replacement.
 * t("game.nextTurnPrompt", { team: "Takım A" }) → "Takım A BAŞLASIN"
 */
export const t = (key, params = {}) => {
    const value = i18n.t(key, { defaults: [{ message: key }] });
    if (!params || typeof value !== "string") return value;
    return Object.keys(params).reduce(
        (acc, p) => acc.replace(new RegExp(`\\{${p}\\}`, "g"), String(params[p])),
        value
    );
};

export default i18n;
