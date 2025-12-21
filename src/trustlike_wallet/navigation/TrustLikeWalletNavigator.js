import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';

import TrustLikeWalletEntryScreen from '../screens/TrustLikeWalletEntryScreen';
import TrustLikeWalletOnboardingScreen from '../screens/TrustLikeWalletOnboardingScreen';
import TrustLikeWalletCreateScreen from '../screens/TrustLikeWalletCreateScreen';
import TrustLikeWalletRestoreScreen from '../screens/TrustLikeWalletRestoreScreen';
import TrustLikeWalletHomeScreen from '../screens/TrustLikeWalletHomeScreen';
import TrustLikeDappBrowserScreen from '../screens/TrustLikeDappBrowserScreen';

const Stack = createStackNavigator();

export default function TrustLikeWalletNavigator() {
    return (
        <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen
                name="TrustLikeWalletEntry"
                component={TrustLikeWalletEntryScreen}
            />
            <Stack.Screen
                name="TrustLikeWalletOnboarding"
                component={TrustLikeWalletOnboardingScreen}
            />
            <Stack.Screen
                name="TrustLikeWalletCreate"
                component={TrustLikeWalletCreateScreen}
            />
            <Stack.Screen
                name="TrustLikeWalletRestore"
                component={TrustLikeWalletRestoreScreen}
            />
            <Stack.Screen
                name="TrustLikeWalletHome"
                component={TrustLikeWalletHomeScreen}
            />
            <Stack.Screen
                name="TrustLikeDappBrowser"
                component={TrustLikeDappBrowserScreen}
            />
        </Stack.Navigator>
    );
}

