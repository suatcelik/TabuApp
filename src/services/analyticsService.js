// expo-firebase-analytics bazen TypeError fırlatabiliyor, geçici olarak mockluyoruz.
export const logGameStart = async () => {
    console.log("Mock Analytics: game_start");
};

export const logRoundEnd = async (team, score) => {
    console.log(`Mock Analytics: round_end - Team ${team}, Score ${score}`);
};
