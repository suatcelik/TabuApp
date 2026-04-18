// Theme definitions: one place to describe how every visual theme looks.
// Each theme maps to surface/content/accent tokens so screens can style themselves
// consistently without branching on `selectedTheme` directly.

export const THEMES = {
    default: {
        id: "default",
        isDark: false,
        surfaceBg: "#f8fafc",          // slate-50
        surfaceElevated: "#ffffff",
        primaryBg: "#a21caf",          // fuchsia-700
        accentBg: "#f59e0b",           // amber-500
        infoBg: "#0ea5e9",             // sky-500
        successBg: "#10b981",
        dangerBg: "#ef4444",
        text: "#0f172a",
        textMuted: "#64748b",
        border: "#e2e8f0",
        statusBar: "dark-content",
        navigationBg: "#ffffff",
        bubbleColors: {
            a: "rgba(232, 121, 249, 0.5)",   // fuchsia-400
            b: "rgba(254, 205, 211, 0.5)",   // rose-200
            c: "rgba(186, 230, 253, 0.5)",   // sky-200
            d: "rgba(254, 240, 138, 0.5)",   // yellow-200
        },
    },
    neon_shhh: {
        id: "neon_shhh",
        isDark: true,
        surfaceBg: "#0f172a",
        surfaceElevated: "#1e293b",
        primaryBg: "#22d3ee",
        accentBg: "#f472b6",
        infoBg: "#818cf8",
        successBg: "#34d399",
        dangerBg: "#f87171",
        text: "#f1f5f9",
        textMuted: "#94a3b8",
        border: "#334155",
        statusBar: "light-content",
        navigationBg: "#0f172a",
        bubbleColors: {
            a: "rgba(34, 211, 238, 0.25)",
            b: "rgba(192, 38, 211, 0.25)",
            c: "rgba(59, 130, 246, 0.25)",
            d: "rgba(244, 114, 182, 0.25)",
        },
    },
    retro_buzz: {
        id: "retro_buzz",
        isDark: false,
        surfaceBg: "#fff7ed",          // orange-50
        surfaceElevated: "#ffffff",
        primaryBg: "#ea580c",          // orange-600
        accentBg: "#facc15",
        infoBg: "#0369a1",
        successBg: "#16a34a",
        dangerBg: "#dc2626",
        text: "#431407",
        textMuted: "#9a3412",
        border: "#fed7aa",
        statusBar: "dark-content",
        navigationBg: "#fff7ed",
        bubbleColors: {
            a: "rgba(253, 186, 116, 0.45)",
            b: "rgba(251, 191, 36, 0.4)",
            c: "rgba(254, 215, 170, 0.6)",
            d: "rgba(253, 164, 175, 0.35)",
        },
    },
    golden_victory: {
        id: "golden_victory",
        isDark: true,
        surfaceBg: "#18181b",
        surfaceElevated: "#27272a",
        primaryBg: "#eab308",
        accentBg: "#f59e0b",
        infoBg: "#d4d4d8",
        successBg: "#22c55e",
        dangerBg: "#ef4444",
        text: "#fafaf9",
        textMuted: "#a1a1aa",
        border: "#3f3f46",
        statusBar: "light-content",
        navigationBg: "#18181b",
        bubbleColors: {
            a: "rgba(234, 179, 8, 0.2)",
            b: "rgba(245, 158, 11, 0.18)",
            c: "rgba(212, 212, 216, 0.12)",
            d: "rgba(234, 179, 8, 0.15)",
        },
    },
    pixel_guesser: {
        id: "pixel_guesser",
        isDark: false,
        surfaceBg: "#ecfdf5",
        surfaceElevated: "#ffffff",
        primaryBg: "#10b981",
        accentBg: "#f59e0b",
        infoBg: "#0ea5e9",
        successBg: "#14b8a6",
        dangerBg: "#ef4444",
        text: "#064e3b",
        textMuted: "#047857",
        border: "#a7f3d0",
        statusBar: "dark-content",
        navigationBg: "#ecfdf5",
        bubbleColors: {
            a: "rgba(110, 231, 183, 0.5)",
            b: "rgba(153, 246, 228, 0.5)",
            c: "rgba(165, 243, 252, 0.45)",
            d: "rgba(254, 240, 138, 0.4)",
        },
    },
    graffiti_shhh: {
        id: "graffiti_shhh",
        isDark: false,
        surfaceBg: "#fff1f2",
        surfaceElevated: "#ffffff",
        primaryBg: "#e11d48",
        accentBg: "#f43f5e",
        infoBg: "#a21caf",
        successBg: "#16a34a",
        dangerBg: "#be123c",
        text: "#4c0519",
        textMuted: "#9f1239",
        border: "#fecdd3",
        statusBar: "dark-content",
        navigationBg: "#fff1f2",
        bubbleColors: {
            a: "rgba(253, 164, 175, 0.5)",
            b: "rgba(249, 168, 212, 0.5)",
            c: "rgba(252, 165, 165, 0.5)",
            d: "rgba(253, 186, 116, 0.4)",
        },
    },
};

export const getTheme = (id) => THEMES[id] || THEMES.default;

export const TEAM_COLORS = [
    { id: "fuchsia", label: "Fuşya", hex: "#a21caf" },
    { id: "sky", label: "Gök", hex: "#0ea5e9" },
    { id: "amber", label: "Amber", hex: "#f59e0b" },
    { id: "emerald", label: "Zümrüt", hex: "#10b981" },
    { id: "rose", label: "Gül", hex: "#e11d48" },
    { id: "indigo", label: "İndigo", hex: "#4f46e5" },
];

export const getTeamColorHex = (id) =>
    TEAM_COLORS.find((c) => c.id === id)?.hex || TEAM_COLORS[0].hex;
