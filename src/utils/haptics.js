import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import useGameStore from "../store/useGameStore";

// Guard: vibration is a user setting (settings.vibration).
// Any haptic call is a no-op if disabled or on web.
const isEnabled = () => {
    if (Platform.OS === "web") return false;
    try {
        return useGameStore.getState()?.settings?.vibration !== false;
    } catch (_) {
        return true;
    }
};

const safe = (fn) => {
    if (!isEnabled()) return;
    try {
        fn();
    } catch (_) { }
};

export const hapticLight = () =>
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

export const hapticMedium = () =>
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

export const hapticHeavy = () =>
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

export const hapticSelection = () =>
    safe(() => Haptics.selectionAsync());

export const hapticSuccess = () =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const hapticWarning = () =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

export const hapticError = () =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));

export default {
    light: hapticLight,
    medium: hapticMedium,
    heavy: hapticHeavy,
    selection: hapticSelection,
    success: hapticSuccess,
    warning: hapticWarning,
    error: hapticError,
};
