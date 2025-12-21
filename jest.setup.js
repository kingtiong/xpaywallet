import 'react-native-gesture-handler/jestSetup';

// Reanimated has its own jest mock.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Silence the warning: "useNativeDriver is not supported"
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Native modules (storage/secure) that are unavailable in Jest environment.
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY'},
  setGenericPassword: jest.fn(() => Promise.resolve()),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-fast-crypto', () => ({
  pbkdf2: jest.fn(),
  randomBytes: jest.fn(() => Buffer.from([])),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-community/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Some dependencies expect fetch to exist in the test environment.
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    }),
  );
}

jest.mock('react-native-app-intro-slider', () => {
  const React = require('react');
  return function AppIntroSlider() {
    return React.createElement(React.Fragment, null);
  };
});

jest.mock('react-native-actions-sheet', () => {
  const React = require('react');
  const SheetProvider = ({children}) =>
    React.createElement(React.Fragment, null, children);
  const ActionSheet = () => React.createElement(React.Fragment, null);
  return {__esModule: true, default: ActionSheet, SheetProvider};
});

// Icon fonts are native; mock them as no-op components.
const mockVectorIcon = () => {
  const React = require('react');
  return function VectorIcon() {
    return React.createElement(React.Fragment, null);
  };
};

jest.mock('react-native-vector-icons/AntDesign', () => mockVectorIcon());
jest.mock('react-native-vector-icons/FontAwesome', () => mockVectorIcon());
jest.mock('react-native-vector-icons/FontAwesome5', () => mockVectorIcon());
jest.mock('react-native-vector-icons/Ionicons', () => mockVectorIcon());
jest.mock('react-native-vector-icons/Feather', () => mockVectorIcon());
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => mockVectorIcon());
jest.mock('react-native-vector-icons/Entypo', () => mockVectorIcon());
jest.mock('react-native-vector-icons/MaterialIcons', () => mockVectorIcon());
jest.mock('react-native-vector-icons/SimpleLineIcons', () => mockVectorIcon());
jest.mock('react-native-vector-icons/Octicons', () => mockVectorIcon());
jest.mock('react-native-vector-icons/Foundation', () => mockVectorIcon());
jest.mock('react-native-vector-icons/EvilIcons', () => mockVectorIcon());

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  return function LinearGradient({children}) {
    return React.createElement(React.Fragment, null, children);
  };
});

jest.mock('@haskkor/react-native-pincode', () => {
  const React = require('react');
  return {__esModule: true, default: () => React.createElement(React.Fragment, null)};
});

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

