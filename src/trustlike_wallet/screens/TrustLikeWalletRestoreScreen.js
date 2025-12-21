import React, {useState} from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import {VaultService} from '../core/vault/VaultService';

export default function TrustLikeWalletRestoreScreen({navigation}) {
    const [mnemonic, setMnemonic] = useState('');
    const [busy, setBusy] = useState(false);

    const restore = async () => {
        try {
            setBusy(true);
            await VaultService.restoreWallet(mnemonic);
            navigation.reset({
                index: 0,
                routes: [{name: 'TrustLikeWalletHome'}],
            });
        } catch (e) {
            Alert.alert('Restore failed', e?.message || 'Unknown error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Restore wallet</Text>
                <Text style={styles.subtitle}>
                    Paste your 12/24-word recovery phrase (words separated by spaces).
                </Text>

                <View style={styles.inputBox}>
                    <TextInput
                        value={mnemonic}
                        onChangeText={setMnemonic}
                        placeholder="recovery phrase…"
                        autoCapitalize="none"
                        autoCorrect={false}
                        multiline
                        style={styles.input}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, styles.primary]}
                    onPress={restore}
                    disabled={busy}>
                    <Text style={[styles.buttonText, styles.primaryText]}>
                        {busy ? 'Restoring…' : 'Restore'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondary]}
                    onPress={() => navigation.goBack()}
                    disabled={busy}>
                    <Text style={[styles.buttonText, styles.secondaryText]}>
                        Back
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
    subtitle: {marginTop: 10, fontSize: 14, color: '#444', lineHeight: 20},
    inputBox: {
        marginTop: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
        padding: 12,
    },
    input: {minHeight: 120, color: '#111', fontSize: 15, lineHeight: 22},
    button: {
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginTop: 12,
        borderWidth: 1,
    },
    primary: {backgroundColor: '#111', borderColor: '#111'},
    secondary: {backgroundColor: '#fff', borderColor: '#ddd'},
    buttonText: {textAlign: 'center', fontSize: 16, fontWeight: '600'},
    primaryText: {color: '#fff'},
    secondaryText: {color: '#111'},
});

