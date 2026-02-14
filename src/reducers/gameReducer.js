export const initialState = {
    words: [],
    currentIndex: 0,

    // ✅ takım ve tur
    activeTeam: "A",
    roundNumber: 1,       // 1..roundsPerTeam
    roundsPerTeam: 4,     // ayarlardan gelecek

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
                loading: !hasWords,

                // ✅ yeni oyun başlangıcı
                activeTeam: "A",
                roundNumber: 1,
                isGameOver: false,

                // ✅ kelime geldiyse A turu otomatik başlar
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
            return {
                ...state,
                currentIndex: nextIndex(state),
                teamAScore: isTeamA ? state.teamAScore - 1 : state.teamAScore,
                teamBScore: !isTeamA ? state.teamBScore - 1 : state.teamBScore,
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
            // payload: { duration, maxPass, roundsPerTeam } gelebilir
            const duration = action.payload?.duration ?? state.timeLeft ?? 60;
            const maxPass =
                action.payload?.maxPass !== undefined ? action.payload.maxPass : state.passCount ?? 3;

            const roundsPerTeam =
                action.payload?.roundsPerTeam !== undefined
                    ? Math.max(1, Number(action.payload.roundsPerTeam) || 1)
                    : state.roundsPerTeam;

            // A turu bitti -> aynı turun B sırası
            if (state.activeTeam === "A") {
                return {
                    ...state,
                    activeTeam: "B",
                    roundsPerTeam,
                    timeLeft: duration,
                    passCount: maxPass,
                    isActive: false, // B otomatik başlamasın (modal + START_TURN ile başlasın)
                };
            }

            // B turu bitti -> ya bir sonraki tur A, ya oyun biter
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
                activeTeam: "A",
                roundNumber: state.roundNumber + 1,
                roundsPerTeam,
                timeLeft: duration,
                passCount: maxPass,
                isActive: false, // A da otomatik başlamasın (modal + START_TURN ile)
            };
        }

        case "START_TURN":
            return {
                ...state,
                isActive: true,
            };

        case "INIT_SETTINGS": {
            const roundsPerTeam =
                action.payload?.roundsPerTeam !== undefined
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
