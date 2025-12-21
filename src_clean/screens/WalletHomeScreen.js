import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {vault} from '../wallet/vault';
import {deriveAllAccounts} from '../wallet/derive';

export default function WalletHomeScreen({navigation}) {
    const [accounts, setAccounts] = useState(null);

    const load = async () => {
        const mnemonic = await vault.loadMnemonic();
        if (!mnemonic) {
            navigation.reset({index: 0, routes: [{name: 'Onboarding'}]});
            return;
        }
        const acc = await deriveAllAccounts(mnemonic, 0);
        setAccounts(acc);
    };

    useEffect(() => {
        load().catch(e => Alert.alert('Error', e?.message || 'Failed to load wallet'));
    }, []);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Accounts</Text>

            {!accounts ? (
                <Text style={styles.subtitle}>Loading…</Text>
            ) : (
                <>
                    <Card label="Bitcoin (BTC)" value={accounts.btc.address} />
                    <Card label="Ethereum (EVM)" value={accounts.evm.address} />
                    <Card label="BSC (EVM)" value={accounts.evm.address} />
                    <Card label="Tron (TRX)" value={accounts.tron.address} />
                    <Card label="Solana (SOL)" value={accounts.sol.address} />
                </>
            )}

            <TouchableOpacity
                style={[styles.button, styles.secondary]}
                onPress={async () => {
                    await vault.clear();
                    navigation.reset({index: 0, routes: [{name: 'Onboarding'}]});
                }}>
                <Text style={styles.secondaryText}>Delete local wallet (dev)</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

function Card({label, value}) {
    return (
        <View style={styles.card}>
            <Text style={styles.cardLabel}>{label}</Text>
            <Text style={styles.cardValue} selectable>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {padding: 20, backgroundColor: '#0B1220', flexGrow: 1},
    title: {color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 12},
    subtitle: {color: '#A7B0C0'},
    card: {
        backgroundColor: '#131D33',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#223053',
        marginBottom: 12,
    },
    cardLabel: {color: '#A7B0C0', fontSize: 12, marginBottom: 8},
    cardValue: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
    button: {marginTop: 10, paddingVertical: 14, borderRadius: 12, alignItems: 'center'},
    secondary: {backgroundColor: '#131D33', borderWidth: 1, borderColor: '#223053'},
    secondaryText: {color: '#D6DEEE', fontWeight: '700'},
});

