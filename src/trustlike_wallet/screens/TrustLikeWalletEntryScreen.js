import React, {useEffect} from 'react';
import {ActivityIndicator, SafeAreaView, StyleSheet, Text} from 'react-native';

import {VaultService} from '../core/vault/VaultService';

export default function TrustLikeWalletEntryScreen({navigation}) {
    useEffect(() => {
        (async () => {
            const has = await VaultService.hasWallet();
            navigation.reset({
                index: 0,
                routes: [
                    {
                        name: has
                            ? 'TrustLikeWalletHome'
                            : 'TrustLikeWalletOnboarding',
                    },
                ],
            });
        })();
    }, [navigation]);

    return (
        <SafeAreaView style={styles.container}>
            <ActivityIndicator />
            <Text style={styles.text}>Loading wallet…</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    text: {
        marginTop: 12,
        color: '#444',
    },
});

