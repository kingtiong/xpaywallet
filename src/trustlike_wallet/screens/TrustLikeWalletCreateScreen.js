import React, {useEffect, useState} from 'react';
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

export default function TrustLikeWalletCreateScreen({navigation}) {
    const [mnemonic, setMnemonic] = useState('');

    useEffect(() => {
        (async () => {
            const m = await VaultService.createWallet();
            setMnemonic(m);
        })();
    }, []);

    const copy = () => {
        Clipboard.setString(mnemonic);
        Alert.alert('Copied', 'Recovery phrase copied to clipboard.');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Your recovery phrase</Text>
                <Text style={styles.subtitle}>
                    Write these 12 words down and keep them safe. Anyone with this phrase
                    can control your funds.
                </Text>

                <View style={styles.phraseBox}>
                    <Text style={styles.phrase}>{mnemonic || 'Generating…'}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.button, styles.secondary]}
                    onPress={copy}
                    disabled={!mnemonic}>
                    <Text style={[styles.buttonText, styles.secondaryText]}>
                        Copy phrase
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.primary]}
                    onPress={() =>
                        navigation.reset({
                            index: 0,
                            routes: [{name: 'TrustLikeWalletHome'}],
                        })
                    }
                    disabled={!mnemonic}>
                    <Text style={[styles.buttonText, styles.primaryText]}>
                        I saved it — continue
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
    phraseBox: {
        marginTop: 18,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fafafa',
    },
    phrase: {color: '#111', fontSize: 15, lineHeight: 22},
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

