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
                // ✅ kelime geldiyse A turu otomatik başlar (süre akar, butonlar aktif olur)
                isActive: hasWords,
                // activeTeam zaten "A" başlıyor, dokunmuyoruz
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

        case "NEXT_ROUND":
            // A turu bitti -> B turuna hazırlan (modal + START_TURN ile başlayacak)
            if (state.activeTeam === "A") {
                return {
                    ...state,
                    activeTeam: "B",
                    timeLeft: action.payload?.duration ?? 60,
                    passCount:
                        action.payload?.maxPass !== undefined ? action.payload.maxPass : 3,
                    isActive: false, // B otomatik başlamasın
                };
            }

            // B turu bitti -> oyun bitti
            return {
                ...state,
                isActive: false,
                isGameOver: true,
            };

        case "START_TURN":
            return {
                ...state,
                isActive: true,
            };

        case "INIT_SETTINGS":
            return {
                ...state,
                timeLeft: action.payload?.duration ?? 60,
                passCount:
                    action.payload?.maxPass !== undefined ? action.payload.maxPass : 3,
            };

        case "RESET":
            return initialState;

        default:
            return state;
    }
}
