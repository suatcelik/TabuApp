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
};

export function gameReducer(state, action) {
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
                    timeLeft: 60,
                    passCount: 3,
                    isActive: true,
                };
            } else {
                return {
                    ...state,
                    isActive: false,
                };
            }

        case "RESET":
            return initialState;

        default:
            return state;
    }
}
