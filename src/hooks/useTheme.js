import { useMemo } from "react";
import useGameStore from "../store/useGameStore";
import { getTheme } from "../theme/themes";

/**
 * Single source of truth for theme styling across every screen.
 * Reads the currently selected theme id from persisted settings and returns
 * a pre-computed style bundle. Screens pull styles from this hook instead
 * of branching on the raw `selectedTheme` string.
 */
export default function useTheme() {
    const themeId = useGameStore((s) => s.settings?.selectedTheme || "default");

    return useMemo(() => {
        const theme = getTheme(themeId);
        return {
            ...theme,
            // Derived tailwind-friendly helpers
            textClass: theme.isDark ? "text-slate-100" : "text-slate-800",
            textMutedClass: theme.isDark ? "text-slate-400" : "text-slate-500",
            surfaceClass: theme.isDark ? "bg-slate-900" : "bg-slate-50",
            elevatedClass: theme.isDark ? "bg-slate-800" : "bg-white",
            borderClass: theme.isDark ? "border-slate-700" : "border-slate-200",
        };
    }, [themeId]);
}
