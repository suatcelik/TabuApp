// Design tokens: single source of truth for colors, spacing, radii, shadows, typography.
// Prefer importing tokens over hardcoding hex / numbers.

export const palette = {
    // Brand
    primary: "#a21caf",       // fuchsia-700
    primaryDark: "#86198f",   // fuchsia-800
    primarySoft: "#f5d0fe",   // fuchsia-200
    accent: "#f59e0b",        // amber-500
    accentSoft: "#fde68a",    // amber-200
    info: "#0ea5e9",          // sky-500
    infoSoft: "#bae6fd",      // sky-200
    success: "#10b981",       // emerald-500
    danger: "#ef4444",        // red-500
    dangerSoft: "#fecaca",    // red-200
    warning: "#f59e0b",

    // Neutrals
    ink: "#0f172a",           // slate-900
    inkSoft: "#1e293b",       // slate-800
    text: "#334155",          // slate-700
    muted: "#64748b",         // slate-500
    mutedSoft: "#94a3b8",     // slate-400
    line: "#e2e8f0",          // slate-200
    surface: "#ffffff",
    surfaceAlt: "#f8fafc",    // slate-50
    surfaceMuted: "#f1f5f9",  // slate-100

    // Dark theme ink
    darkSurface: "#0f172a",
    darkSurfaceAlt: "#1e293b",
    darkText: "#e2e8f0",
};

export const radii = {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 32,
    pill: 999,
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const shadows = {
    sm: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    lg: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
    },
    glow: (color = "#a21caf") => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 10,
    }),
};

export const typography = {
    display: { fontWeight: "900", letterSpacing: -1 },
    title: { fontWeight: "900", letterSpacing: -0.5 },
    heading: { fontWeight: "800" },
    body: { fontWeight: "600" },
    caption: { fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
};

export const motion = {
    fast: 180,
    base: 260,
    slow: 420,
    spring: { damping: 14, stiffness: 180, mass: 0.8 },
    springBouncy: { damping: 10, stiffness: 220, mass: 0.8 },
};

export default { palette, radii, spacing, shadows, typography, motion };
