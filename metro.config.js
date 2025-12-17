/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

module.exports = {
  transformer: {
    // Force Metro to use terser (instead of uglify) so modern JS (BigInt, etc.) parses.
    minifierPath: require.resolve('metro-minify-terser'),
    // Metro minifier (terser) defaults to a low ECMAScript version, which can fail
    // to parse modern syntax from some dependencies (e.g. numeric separators like 900_000).
    // Numeric separators require ES2021+, so we bump to a modern ECMA level.
    minifierConfig: {
      // Parse modern syntax, but DO NOT output modern syntax.
      // Some Android JS runtimes (JSC) will crash on `?.` / `??` if terser emits them.
      // Keep output ES5-compatible.
      parse: { ecma: 2022 },
      compress: { ecma: 5 },
      mangle: true,
      output: {
        ecma: 5,
        comments: false,
        ascii_only: true,
      },
    },
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
