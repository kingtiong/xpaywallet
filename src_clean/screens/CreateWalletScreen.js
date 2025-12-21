import React, {useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {generateMnemonic} from '../wallet/mnemonic';
import {vault} from '../wallet/vault';

export default function CreateWalletScreen({navigation}) {
    const [busy, setBusy] = useState(false);
    const mnemonic = useMemo(() => generateMnemonic(128), []); // 12 words

    const onContinue = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await vault.saveMnemonic(mnemonic);
            navigation.reset({index: 0, routes: [{name: 'WalletHome'}]});
        } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to save wallet');
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Your recovery phrase</Text>
            <Text style={styles.subtitle}>
                Write these 12 words down in order. Never share them.
            </Text>

            <View style={styles.card}>
                <Text style={styles.mnemonic}>{mnemonic}</Text>
            </View>

            <TouchableOpacity
                disabled={busy}
                style={[styles.button, styles.primary, busy && {opacity: 0.6}]}
                onPress={onContinue}>
                <Text style={styles.primaryText}>
                    {busy ? 'Saving…' : 'I wrote it down'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {padding: 20, backgroundColor: '#0B1220', flexGrow: 1},
    title: {color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 8},
    subtitle: {color: '#A7B0C0', marginBottom: 16},
    card: {backgroundColor: '#131D33', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#223053'},
    mnemonic: {color: '#FFFFFF', fontSize: 16, lineHeight: 24, fontWeight: '600'},
    button: {marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center'},
    primary: {backgroundColor: '#2D6BFF'},
    primaryText: {color: '#FFFFFF', fontWeight: '700'},
});

