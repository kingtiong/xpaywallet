module.exports = {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: [
        // Ensure generated bundle is compatible with older Android JS runtimes (JSC).
        // Some dependencies ship modern syntax (`?.`, `??`, numeric separators).
        '@babel/plugin-transform-optional-chaining',
        '@babel/plugin-transform-nullish-coalescing-operator',
        '@babel/plugin-transform-numeric-separator',
        [
            'module-resolver',
            {
                alias: {
                    '@contracts': './src/contracts',
                    '@modules': './src/modules',
                    '@components': './src/components',
                    '@persistence': './src/persistence',
                    '@assets': './src/assets',
                    '@screens': './src/screens',
                    '@data': './src/data',
                    '@src': './src',
                },
            },
        ],
        [
            'react-native-reanimated/plugin',
            {
                relativeSourceLocation: true,
            },
        ]
    ],
    overrides: [
        // Some dependencies ship modern JS syntax that older Android JSC can't parse
        // (e.g. `??`, `?.`, numeric separators like `900_000`). Force-transform `ox`.
        {
            test: /node_modules[\\/](ox)[\\/]/,
            plugins: [
                '@babel/plugin-transform-nullish-coalescing-operator',
                '@babel/plugin-transform-optional-chaining',
                '@babel/plugin-transform-numeric-separator',
            ],
        },
    ],
};
