/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

module.exports = {
  transformer: {
    // Metro minifier (terser) defaults to a low ECMAScript version, which can fail
    // to parse modern syntax from some dependencies (e.g. numeric separators like 900_000).
    // Bump the parser ECMA level so release bundling/minification succeeds.
    minifierConfig: {
      ecma: 2020,
      parse: {
        ecma: 2020,
      },
      output: {
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
