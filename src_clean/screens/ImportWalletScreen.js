import React, {useState} from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {isValidMnemonic, normalizeMnemonic} from '../wallet/mnemonic';
import {vault} from '../wallet/vault';

export default function ImportWalletScreen({navigation}) {
    const [value, setValue] = useState('');
    const [busy, setBusy] = useState(false);

    const onImport = async () => {
        if (busy) return;
        const normalized = normalizeMnemonic(value);
        if (!isValidMnemonic(normalized)) {
            Alert.alert('Invalid phrase', 'Please enter a valid 12/24-word phrase.');
            return;
        }
        setBusy(true);
        try {
            await vault.saveMnemonic(normalized);
            navigation.reset({index: 0, routes: [{name: 'WalletHome'}]});
        } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to import wallet');
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Import wallet</Text>
            <Text style={styles.subtitle}>Paste your 12 or 24 words.</Text>
            <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="seed phrase…"
                placeholderTextColor="#6B7896"
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                style={styles.input}
            />
            <TouchableOpacity
                disabled={busy}
                style={[styles.button, styles.primary, busy && {opacity: 0.6}]}
                onPress={onImport}>
                <Text style={styles.primaryText}>{busy ? 'Importing…' : 'Import'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, padding: 20, backgroundColor: '#0B1220'},
    title: {color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 8},
    subtitle: {color: '#A7B0C0', marginBottom: 16},
    input: {
        minHeight: 140,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#223053',
        backgroundColor: '#131D33',
        color: '#FFFFFF',
        padding: 14,
        textAlignVertical: 'top',
    },
    button: {marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center'},
    primary: {backgroundColor: '#2D6BFF'},
    primaryText: {color: '#FFFFFF', fontWeight: '700'},
});

