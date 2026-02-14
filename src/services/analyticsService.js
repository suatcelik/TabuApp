import * as Analytics from "expo-firebase-analytics";

export const logGameStart = async () => {
    await Analytics.logEvent("game_start");
};

export const logRoundEnd = async (team, score) => {
    await Analytics.logEvent("round_end", {
        team,
        score,
    });
};
