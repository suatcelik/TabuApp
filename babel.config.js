module.exports = function (api) {
    api.cache(true);

    const isProd = process.env.NODE_ENV === "production";

    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            // ✅ Production'da console.log silinir (warn ve error kalır)
            isProd && [
                "transform-remove-console",
                { exclude: ["error", "warn"] },
            ],

            // ⚠️ BU HER ZAMAN EN SONDA OLMALI
            "react-native-reanimated/plugin",
        ].filter(Boolean),
    };
};
