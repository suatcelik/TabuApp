/**
 * Rotating notification copy. A deterministic index based on the day-of-year
 * is chosen so the user sees a different message each day but messages repeat
 * predictably in a calendar year.
 */
const NOON_POOL = [
    {
        title: "Tabu Zamanı! 🎭",
        body: "Arkadaşlarınla kelime dağarcığını test etmeye ne dersin?",
    },
    {
        title: "Öğle Arası Molası ☕",
        body: "Kısa bir Tabu turuyla molanı renklendir.",
    },
    {
        title: "Beyin Çalıştırma Saati 🧠",
        body: "Yasaklı kelimeler arasında doğru anlatabilecek misin?",
    },
    {
        title: "Yarışma Başlasın! 🏁",
        body: "Bir tur Tabu, günün en güzel anısı olabilir.",
    },
    {
        title: "Kim Kazanacak? 🤔",
        body: "Takımını topla, kelime savaşı başlıyor!",
    },
];

const EVENING_POOL = [
    {
        title: "Günün Yorgunluğunu At! 🎲",
        body: "Eğlenceye katıl, kelimeleri anlatırken tabulara dikkat et!",
    },
    {
        title: "Keyifli Akşamlar! 🌙",
        body: "Bir tur Tabu ile günü tatlıya bağla.",
    },
    {
        title: "Sen de Katıl! ✨",
        body: "Arkadaşlarınla küçük bir yarışmaya ne dersin?",
    },
    {
        title: "Kelime Zamanı! 🗣️",
        body: "Bugün en çok puanı hangi takım alacak?",
    },
    {
        title: "Eğlence Başlasın 🎉",
        body: "Tabu GO ile akşamın tadını çıkar.",
    },
];

const dayOfYear = (d = new Date()) => {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const pickNoonMessage = () => {
    const idx = dayOfYear() % NOON_POOL.length;
    return NOON_POOL[idx];
};

export const pickEveningMessage = () => {
    const idx = dayOfYear() % EVENING_POOL.length;
    return EVENING_POOL[idx];
};
