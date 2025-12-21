import React from 'react';
import {SafeAreaView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

export default function TrustLikeWalletOnboardingScreen({navigation}) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>TrustLike Wallet</Text>
                <Text style={styles.subtitle}>
                    Create or restore a multi-chain wallet (BTC / ERC20 / BEP20 / TRC20 / SOL).
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.button, styles.primary]}
                onPress={() => navigation.navigate('TrustLikeWalletCreate')}>
                <Text style={[styles.buttonText, styles.primaryText]}>
                    Create new wallet
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.secondary]}
                onPress={() => navigation.navigate('TrustLikeWalletRestore')}>
                <Text style={[styles.buttonText, styles.secondaryText]}>
                    Restore with recovery phrase
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, padding: 20, justifyContent: 'center'},
    header: {marginBottom: 28},
    title: {fontSize: 28, fontWeight: '700', color: '#111'},
    subtitle: {marginTop: 10, fontSize: 14, color: '#444', lineHeight: 20},
    button: {
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    primary: {backgroundColor: '#111', borderColor: '#111'},
    secondary: {backgroundColor: '#fff'},
    buttonText: {textAlign: 'center', fontSize: 16, fontWeight: '600'},
    primaryText: {color: '#fff'},
    secondaryText: {color: '#111'},
});

