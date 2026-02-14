export const initialState = {
    words: [],
    currentIndex: 0,
    activeTeam: "A",
    teamAScore: 0,
    teamBScore: 0,
    passCount: 3,
    timeLeft: 60,
    isActive: false,
    loading: true,
    isGameOver: false,
};

export function gameReducer(state = initialState, action) {
    if (!state) return initialState;
    switch (action.type) {
        case "SET_WORDS":
            return {
                ...state,
                words: action.payload,
                loading: false,
                isActive: true,
            };

        case "SUCCESS":
            return {
                ...state,
                currentIndex: state.currentIndex + 1,
                teamAScore:
                    state.activeTeam === "A"
                        ? state.teamAScore + 1
                        : state.teamAScore,
                teamBScore:
                    state.activeTeam === "B"
                        ? state.teamBScore + 1
                        : state.teamBScore,
            };

        case "TABOO":
            return {
                ...state,
                currentIndex: state.currentIndex + 1,
                teamAScore:
                    state.activeTeam === "A"
                        ? state.teamAScore - 1
                        : state.teamAScore,
                teamBScore:
                    state.activeTeam === "B"
                        ? state.teamBScore - 1
                        : state.teamBScore,
            };

        case "PASS":
            if (state.passCount <= 0) return state;
            return {
                ...state,
                passCount: state.passCount - 1,
                currentIndex: state.currentIndex + 1,
            };

        case "TICK":
            if (state.timeLeft <= 1) {
                return { ...state, timeLeft: 0, isActive: false };
            }
            return { ...state, timeLeft: state.timeLeft - 1 };

        case "NEXT_ROUND":
            if (state.activeTeam === "A") {
                return {
                    ...state,
                    activeTeam: "B",
                    timeLeft: action.payload?.duration || 60,
                    passCount: action.payload?.maxPass !== undefined ? action.payload.maxPass : 3,
                    isActive: false, // Don't start automatically
                };
            } else {
                return {
                    ...state,
                    isActive: false,
                    isGameOver: true,
                };
            }

        case "START_TURN":
            return {
                ...state,
                isActive: true,
            };

        case "INIT_SETTINGS":
            return {
                ...state,
                timeLeft: action.payload.duration || 60,
                passCount: action.payload.maxPass !== undefined ? action.payload.maxPass : 3,
            };

        case "RESET":
            return initialState;

        default:
            return state;
    }
}
