import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import OnboardingScreen from './screens/OnboardingScreen';
import CreateWalletScreen from './screens/CreateWalletScreen';
import ImportWalletScreen from './screens/ImportWalletScreen';
import WalletHomeScreen from './screens/WalletHomeScreen';

const Stack = createNativeStackNavigator();

export default function AppRoot() {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <NavigationContainer>
                <Stack.Navigator
                    screenOptions={{
                        headerShown: true,
                        headerStyle: {backgroundColor: '#0B1220'},
                        headerTintColor: '#FFFFFF',
                        contentStyle: {backgroundColor: '#0B1220'},
                    }}>
                    <Stack.Screen
                        name="Onboarding"
                        component={OnboardingScreen}
                        options={{title: 'Wallet'}}
                    />
                    <Stack.Screen
                        name="CreateWallet"
                        component={CreateWalletScreen}
                        options={{title: 'Create Wallet'}}
                    />
                    <Stack.Screen
                        name="ImportWallet"
                        component={ImportWalletScreen}
                        options={{title: 'Import Wallet'}}
                    />
                    <Stack.Screen
                        name="WalletHome"
                        component={WalletHomeScreen}
                        options={{title: 'Your Wallet'}}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#0B1220'},
});

