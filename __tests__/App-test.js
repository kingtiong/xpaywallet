/**
 * @format
 */

import 'react-native';
import React from 'react';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';
import TrustLikeWalletOnboardingScreen from '../src/trustlike_wallet/screens/TrustLikeWalletOnboardingScreen';

it('renders correctly', () => {
  const navigation = {navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn()};
  renderer.create(<TrustLikeWalletOnboardingScreen navigation={navigation} />);
});
