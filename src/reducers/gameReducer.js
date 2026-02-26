export const initialState = {
    words: [],
    currentIndex: 0,

    // ✅ takım ve tur
    activeTeam: "A",
    roundNumber: 1,
    roundsPerTeam: 4,

    teamAScore: 0,
    teamBScore: 0,
    passCount: 3,
    timeLeft: 60,
    isActive: false,
    loading: true,
    isGameOver: false,
};

// yardımcı: index güvenliği
const nextIndex = (state) => {
    const next = state.currentIndex + 1;
    if (!Array.isArray(state.words) || state.words.length === 0) return next;
    return Math.min(next, state.words.length - 1);
};

export function gameReducer(state = initialState, action) {
    if (!state) return initialState;

    switch (action.type) {
        case "SET_WORDS": {
            const list = Array.isArray(action.payload) ? action.payload : [];
            const hasWords = list.length > 0;

            return {
                ...state,
                words: list,
                currentIndex: 0,
                loading: false,
                activeTeam: "A",
                roundNumber: 1,
                isGameOver: false,
                isActive: hasWords,
            };
        }

        case "SUCCESS": {
            const isTeamA = state.activeTeam === "A";
            return {
                ...state,
                currentIndex: nextIndex(state),
                teamAScore: isTeamA ? state.teamAScore + 1 : state.teamAScore,
                teamBScore: !isTeamA ? state.teamBScore + 1 : state.teamBScore,
            };
        }

        case "TABOO": {
            const isTeamA = state.activeTeam === "A";
            // ✅ Puanın 0'ın altına düşmesini engellemek için Math.max(0, ...) eklendi
            return {
                ...state,
                currentIndex: nextIndex(state),
                teamAScore: isTeamA ? Math.max(0, state.teamAScore - 1) : state.teamAScore,
                teamBScore: !isTeamA ? Math.max(0, state.teamBScore - 1) : state.teamBScore,
            };
        }

        case "PASS":
            if (state.passCount <= 0) return state;
            return {
                ...state,
                passCount: state.passCount - 1,
                currentIndex: nextIndex(state),
            };

        case "TICK":
            if (state.timeLeft <= 1) {
                return { ...state, timeLeft: 0, isActive: false };
            }
            return { ...state, timeLeft: state.timeLeft - 1 };

        case "NEXT_ROUND": {
            const duration = action.payload?.duration ?? 60;
            const maxPass = action.payload?.maxPass !== undefined ? action.payload.maxPass : 3;
            const roundsPerTeam = action.payload?.roundsPerTeam !== undefined
                ? Math.max(1, Number(action.payload.roundsPerTeam) || 1)
                : state.roundsPerTeam;

            // ✅ Tur bittiğinde kelimenin aynı kalmaması için index ilerletildi
            const sharedUpdates = {
                currentIndex: nextIndex(state),
                timeLeft: duration,
                passCount: maxPass,
                isActive: false,
                roundsPerTeam,
            };

            if (state.activeTeam === "A") {
                return {
                    ...state,
                    ...sharedUpdates,
                    activeTeam: "B",
                };
            }

            const isLastRound = state.roundNumber >= roundsPerTeam;

            if (isLastRound) {
                return {
                    ...state,
                    roundsPerTeam,
                    isActive: false,
                    isGameOver: true,
                };
            }

            return {
                ...state,
                ...sharedUpdates,
                activeTeam: "A",
                roundNumber: state.roundNumber + 1,
            };
        }

        case "START_TURN":
            return {
                ...state,
                isActive: true,
            };

        case "INIT_SETTINGS": {
            const roundsPerTeam = action.payload?.roundsPerTeam !== undefined
                ? Math.max(1, Number(action.payload.roundsPerTeam) || 1)
                : state.roundsPerTeam;

            return {
                ...state,
                timeLeft: action.payload?.duration ?? 60,
                passCount: action.payload?.maxPass !== undefined ? action.payload.maxPass : 3,
                roundsPerTeam,
            };
        }

        case "RESET":
            return initialState;

        default:
            return state;
    }
}