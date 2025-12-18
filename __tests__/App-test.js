/**
 * @format
 */

import 'react-native';
import 'react-native-gesture-handler/jestSetup';
import React from 'react';

jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-app-intro-slider', () => {
  const React = require('react');
  return function AppIntroSlider() {
    return React.createElement(React.Fragment, null);
  };
});

jest.mock('react-native-actions-sheet', () => {
  const React = require('react');
  return {
    SheetProvider: ({children}) => React.createElement(React.Fragment, null, children),
    default: () => React.createElement(React.Fragment, null),
  };
});

const createMockIcon = () => {
  const React = require('react');
  return function MockIcon() {
    return React.createElement(React.Fragment, null);
  };
};

jest.mock('react-native-vector-icons/AntDesign', () => createMockIcon());
jest.mock('react-native-vector-icons/FontAwesome', () => createMockIcon());
jest.mock('react-native-vector-icons/FontAwesome5', () => createMockIcon());
jest.mock('react-native-vector-icons/Ionicons', () => createMockIcon());
jest.mock('react-native-vector-icons/Feather', () => createMockIcon());
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => createMockIcon());
jest.mock('react-native-vector-icons/Entypo', () => createMockIcon());
jest.mock('react-native-vector-icons/MaterialIcons', () => createMockIcon());
jest.mock('react-native-vector-icons/SimpleLineIcons', () => createMockIcon());
jest.mock('react-native-vector-icons/Octicons', () => createMockIcon());
jest.mock('react-native-vector-icons/Foundation', () => createMockIcon());
jest.mock('react-native-vector-icons/EvilIcons', () => createMockIcon());

jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    defaults: { headers: { common: {} } },
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    ...mockAxiosInstance,
  };
});

import App from '../App';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  renderer.create(<App />);
});
