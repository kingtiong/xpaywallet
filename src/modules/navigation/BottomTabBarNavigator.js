import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import HomeScreen from '@screens/home/HomeScreen';
import SettingScreen from '@screens/setting/SettingScreen';
import DAppsScreen from '@screens/dapps/DAppsScreen';

import Icon, { Icons } from '@components/icons/Icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function BottomTabBarNavigator() {
    const { t } = useTranslation();
    const { theme } = useSelector(state => state.ThemeReducer);
    const { appLock } = useSelector(state => state.AppLockReducer);
    const navigation = useNavigation();

    let timeOut = appLock.autoLock;
    let lock = appLock.appLock;
    let inBackground = false;
    let lastDate = Date.now();

    const lockState = nextAppState => {
        if (nextAppState === 'active' && inBackground) {
            const timeDiff = Date.now() - lastDate;
            if (timeDiff > timeOut * 1000 && lock) {
                navigation.navigate('ReEnterPinCodeScreen');
            }
            inBackground = false;
            lastDate = Date.now();
        } else if (nextAppState === 'background') {
            inBackground = true;
            lastDate = Date.now();
        }
    };

    const handleAppStateChange = nextAppState => {
        lockState(nextAppState);
    };

    useEffect(() => {
        const appStateListener = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            appStateListener.remove();
        };
    }, [timeOut, lock]);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    height: Platform.OS === 'android' ? 80 : 90,
                    backgroundColor: theme.tabBarBackground,
                    paddingBottom: 10,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontFamily: 'Sora-Regular',
                },
                tabBarActiveTintColor: theme.button,
                tabBarInactiveTintColor: theme.tabBarInactiveTintColor,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: t('menu_wallet'),
                    tabBarIcon: ({ color, size }) => (
                        <Icon
                            name="wallet-outline"
                            size={32}
                            type={Icons.Ionicons}
                            color={color}
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="DAppsScreen"
                component={DAppsScreen}
                options={{
                    tabBarLabel: t('menu_dapps'),
                    tabBarIcon: ({ color, size }) => (
                        <Icon
                            name="navigate-circle"
                            size={32}
                            type={Icons.Ionicons}
                            color={color}
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="SettingScreen"
                component={SettingScreen}
                options={{
                    tabBarLabel: t('menu_setup'),
                    tabBarIcon: ({ color, size }) => (
                        <Icon
                            name="setting"
                            size={24}
                            type={Icons.AntDesign}
                            color={color}
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

export default BottomTabBarNavigator;
