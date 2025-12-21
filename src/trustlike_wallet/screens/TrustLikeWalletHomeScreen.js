import React, {useEffect, useMemo, useState} from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import {VaultService} from '../core/vault/VaultService';
import {deriveAllAddresses} from '../core/hd/derive';
import {
    getBitcoinSats,
    getEvmNativeBalance,
    getSolanaLamports,
    getTronNativeBalanceSun,
} from '../core/balances/balances';
import {CHAINS} from '../core/chains/chains';

function formatShort(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function TrustLikeWalletHomeScreen({navigation}) {
    const [addresses, setAddresses] = useState(null);
    const [balances, setBalances] = useState({
        btcSats: null,
        eth: null,
        bnb: null,
        trxSun: null,
        solLamports: null,
    });

    useEffect(() => {
        (async () => {
            const m = await VaultService.loadMnemonic();
            if (m) setAddresses(deriveAllAddresses(m));
        })();
    }, []);

    const loadBalances = async () => {
        if (!addresses) return;
        try {
            const [btcSats, eth, bnb, trxSun, solLamports] = await Promise.all([
                getBitcoinSats(addresses.bitcoin),
                getEvmNativeBalance(addresses.evm, CHAINS.ethereum.rpcUrl),
                getEvmNativeBalance(addresses.evm, CHAINS.bsc.rpcUrl),
                getTronNativeBalanceSun(addresses.tron),
                getSolanaLamports(addresses.solana, CHAINS.solana.rpcUrl),
            ]);
            setBalances({btcSats, eth, bnb, trxSun, solLamports});
        } catch (e) {
            Alert.alert('Balance error', e?.message || 'Failed to fetch balances');
        }
    };

    useEffect(() => {
        if (addresses) loadBalances();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addresses]);

    const rows = useMemo(() => {
        if (!addresses) return [];
        return [
            {
                label: 'Bitcoin (BIP84)',
                address: addresses.bitcoin,
                balance:
                    balances.btcSats == null ? '—' : `${balances.btcSats} sats`,
            },
            {
                label: 'Ethereum (ERC20)',
                address: addresses.evm,
                balance: balances.eth == null ? '—' : `${balances.eth} ETH`,
            },
            {
                label: 'BSC (BEP20)',
                address: addresses.evm,
                balance: balances.bnb == null ? '—' : `${balances.bnb} BNB`,
            },
            {
                label: 'Tron (TRC20)',
                address: addresses.tron,
                balance:
                    balances.trxSun == null ? '—' : `${balances.trxSun} sun`,
            },
            {
                label: 'Solana',
                address: addresses.solana,
                balance:
                    balances.solLamports == null
                        ? '—'
                        : `${balances.solLamports} lamports`,
            },
        ];
    }, [addresses, balances]);

    const copy = address => {
        Clipboard.setString(address);
        Alert.alert('Copied', formatShort(address));
    };

    const wipe = () => {
        Alert.alert('Delete wallet?', 'This will remove the recovery phrase from this device.', [
            {text: 'Cancel', style: 'cancel'},
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await VaultService.wipe();
                    navigation.reset({
                        index: 0,
                        routes: [{name: 'TrustLikeWalletOnboarding'}],
                    });
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Wallet</Text>
                <Text style={styles.subtitle}>
                    Single-account MVP (index 0). Balances use public RPC endpoints.
                </Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.button, styles.primary]}
                        onPress={() => navigation.navigate('TrustLikeDappBrowser')}>
                        <Text style={[styles.buttonText, styles.primaryText]}>
                            Open dApp browser
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, styles.secondary]}
                        onPress={loadBalances}>
                        <Text style={[styles.buttonText, styles.secondaryText]}>
                            Refresh balances
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    {rows.map(r => (
                        <View key={r.label} style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Text style={styles.rowTitle}>{r.label}</Text>
                                <Text style={styles.rowAddress}>
                                    {r.address ? formatShort(r.address) : '—'}
                                </Text>
                                <Text style={styles.rowBalance}>{r.balance}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.copyBtn}
                                onPress={() => copy(r.address)}
                                disabled={!r.address}>
                                <Text style={styles.copyBtnText}>Copy</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.button, styles.danger]}
                    onPress={wipe}>
                    <Text style={[styles.buttonText, styles.dangerText]}>
                        Delete wallet from device
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1},
    content: {padding: 20},
    title: {fontSize: 22, fontWeight: '700', color: '#111'},
    subtitle: {marginTop: 10, fontSize: 13, color: '#444', lineHeight: 18},
    actions: {marginTop: 16},
    card: {
        marginTop: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
    },
    rowLeft: {flexShrink: 1, paddingRight: 10},
    rowTitle: {fontSize: 14, fontWeight: '700', color: '#111'},
    rowAddress: {marginTop: 4, fontSize: 13, color: '#444'},
    rowBalance: {marginTop: 4, fontSize: 12, color: '#777'},
    copyBtn: {
        borderWidth: 1,
        borderColor: '#ddd',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#fafafa',
    },
    copyBtnText: {fontWeight: '600', color: '#111'},
    button: {
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    primary: {backgroundColor: '#111', borderColor: '#111'},
    secondary: {backgroundColor: '#fff', borderColor: '#ddd'},
    danger: {backgroundColor: '#fff', borderColor: '#ffdddd', marginTop: 18},
    buttonText: {textAlign: 'center', fontSize: 16, fontWeight: '600'},
    primaryText: {color: '#fff'},
    secondaryText: {color: '#111'},
    dangerText: {color: '#c62828'},
});

