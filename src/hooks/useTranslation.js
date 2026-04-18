import { useCallback } from "react";
import useGameStore from "../store/useGameStore";
import { t as rawT, i18n, setLocale } from "../i18n";

/**
 * Re-renders screens when the language changes by subscribing to
 * `settings.language`. Returns a stable-ish `t` (memoized per language).
 */
export default function useTranslation() {
    const language = useGameStore((s) => s.settings?.language);

    // Force locale sync on every read (cheap, idempotent) — guarantees
    // screens rendered before the store rehydrates still show correct copy.
    if (language && i18n.locale !== language) {
        setLocale(language);
    }

    const t = useCallback((key, params) => rawT(key, params), [language]);
    return { t, locale: i18n.locale };
}
