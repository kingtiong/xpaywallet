import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {WebView} from 'react-native-webview';

import {TrustLikeWalletConnectService} from '../core/walletconnect/TrustLikeWalletConnectService';
import {wcConfig} from '../core/walletconnect/wcConfig';

function normalizeUrl(input) {
    const raw = String(input || '').trim();
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
}

export default function TrustLikeDappBrowserScreen() {
    const webRef = useRef(null);
    const [urlInput, setUrlInput] = useState('https://app.uniswap.org');
    const [currentUrl, setCurrentUrl] = useState('https://app.uniswap.org');
    const [wcUri, setWcUri] = useState('');
    const [wcReady, setWcReady] = useState(false);

    useEffect(() => {
        (async () => {
            await TrustLikeWalletConnectService.init();
            setWcReady(TrustLikeWalletConnectService.isReady);
        })();
    }, []);

    const wcStatus = useMemo(() => {
        if (!wcConfig.projectId) return 'WalletConnect disabled (missing Project ID)';
        return wcReady ? 'WalletConnect ready' : 'WalletConnect initializing…';
    }, [wcReady]);

    const go = () => {
        const u = normalizeUrl(urlInput);
        if (!u) return;
        setCurrentUrl(u);
    };

    const pair = async () => {
        try {
            const uri = wcUri.trim();
            if (!uri) return;
            await TrustLikeWalletConnectService.pair(uri);
            Alert.alert('WalletConnect', 'Pairing request sent.');
        } catch (e) {
            Alert.alert('WalletConnect error', e?.message || 'Failed to pair');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.top}>
                <TextInput
                    value={urlInput}
                    onChangeText={setUrlInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Enter dApp URL"
                    style={styles.urlInput}
                    onSubmitEditing={go}
                    returnKeyType="go"
                />
                <TouchableOpacity style={styles.goBtn} onPress={go}>
                    <Text style={styles.goBtnText}>Go</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.wcRow}>
                <Text style={styles.wcStatus}>{wcStatus}</Text>
            </View>

            <View style={styles.wcBar}>
                <TextInput
                    value={wcUri}
                    onChangeText={setWcUri}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Paste WalletConnect URI (wc:...)"
                    style={styles.wcInput}
                />
                <TouchableOpacity style={styles.pairBtn} onPress={pair}>
                    <Text style={styles.pairBtnText}>Pair</Text>
                </TouchableOpacity>
            </View>

            <WebView
                ref={webRef}
                source={{uri: currentUrl}}
                startInLoadingState
                javaScriptEnabled
                domStorageEnabled
                onNavigationStateChange={nav => {
                    if (nav?.url) setUrlInput(nav.url);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#fff'},
    top: {
        flexDirection: 'row',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        gap: 8,
    },
    urlInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#111',
    },
    goBtn: {
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#111',
        justifyContent: 'center',
    },
    goBtnText: {color: '#fff', fontWeight: '700'},
    wcRow: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
    },
    wcStatus: {fontSize: 12, color: '#444'},
    wcBar: {
        flexDirection: 'row',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        gap: 8,
    },
    wcInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#111',
        fontSize: 12,
    },
    pairBtn: {
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#111',
        justifyContent: 'center',
    },
    pairBtnText: {color: '#fff', fontWeight: '700'},
});

