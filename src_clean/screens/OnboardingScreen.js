import React, {useEffect} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {vault} from '../wallet/vault';

export default function OnboardingScreen({navigation}) {
    useEffect(() => {
        (async () => {
            const exists = await vault.hasMnemonic();
            if (exists) {
                navigation.reset({index: 0, routes: [{name: 'WalletHome'}]});
            }
        })();
    }, [navigation]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Clean Multi-Chain Wallet</Text>
            <Text style={styles.subtitle}>
                Non-custodial. Your keys stay on device.
            </Text>

            <TouchableOpacity
                style={[styles.button, styles.primary]}
                onPress={() => navigation.navigate('CreateWallet')}>
                <Text style={styles.primaryText}>Create Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.secondary]}
                onPress={() => navigation.navigate('ImportWallet')}>
                <Text style={styles.secondaryText}>Import Wallet</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B1220',
        padding: 20,
        justifyContent: 'center',
    },
    title: {color: '#FFFFFF', fontSize: 28, fontWeight: '700'},
    subtitle: {color: '#A7B0C0', fontSize: 14, marginTop: 8, marginBottom: 32},
    button: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    primary: {backgroundColor: '#2D6BFF'},
    secondary: {backgroundColor: '#131D33', borderWidth: 1, borderColor: '#223053'},
    primaryText: {color: '#FFFFFF', fontWeight: '700'},
    secondaryText: {color: '#D6DEEE', fontWeight: '700'},
});

