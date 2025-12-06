import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    StyleSheet,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import CommonText from '@components/commons/CommonText';
import ActionSheet from 'react-native-actions-sheet';
import WebView from 'react-native-webview';
import CommonButton from '@components/commons/CommonButton';
import CommonLoading from '@components/commons/CommonLoading';
import CommonBackButton from '@components/commons/CommonBackButton';
import {
    createWeb3Wallet,
    onConnect,
    web3wallet,
} from '@modules/walletconnect/WalletConnectClient';
import { EIP155_SIGNING_METHODS } from '@modules/walletconnect/EIP155';
import { getSignParamsMessage } from '@modules/walletconnect/HelperUtils';
import {
    approveEIP155Request,
    rejectEIP155Request,
} from '@modules/walletconnect/EIP155Request';
import { WalletFactory } from '@modules/core/factory/WalletFactory';
import { getSdkError } from '@walletconnect/utils';
import _ from 'lodash';
import { CHAIN_ID_MAP, CHAIN_ID_TYPE_MAP } from '@modules/core/constant/constant';
import { WalletConnectAction } from '@persistence/walletconnect/WalletConnectAction';
import CommonAlert from '@components/commons/CommonAlert';
import { useTranslation } from 'react-i18next';

const SIGNING_METHODS = [
    EIP155_SIGNING_METHODS.ETH_SIGN,
    EIP155_SIGNING_METHODS.PERSONAL_SIGN,
    EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA,
    EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3,
    EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4,
    EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION,
    EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION,
];

const PASSIVE_METHODS = [
    EIP155_SIGNING_METHODS.ETH_CHAIN_ID,
    EIP155_SIGNING_METHODS.ETH_ACCOUNTS,
    EIP155_SIGNING_METHODS.ETH_REQUEST_ACCOUNTS,
    EIP155_SIGNING_METHODS.ETH_BLOCK_NUMBER,
    EIP155_SIGNING_METHODS.NET_VERSION,
    EIP155_SIGNING_METHODS.WALLET_SWITCH_ETHEREUM_CHAIN,
    EIP155_SIGNING_METHODS.WALLET_ADD_ETHEREUM_CHAIN,
];

const CHAIN_MANAGEMENT_METHODS = [
    EIP155_SIGNING_METHODS.WALLET_SWITCH_ETHEREUM_CHAIN,
    EIP155_SIGNING_METHODS.WALLET_ADD_ETHEREUM_CHAIN,
];

const AUTO_APPROVED_METHODS = PASSIVE_METHODS.filter(
    method => !CHAIN_MANAGEMENT_METHODS.includes(method),
);

const SUPPORTED_METHODS = [...SIGNING_METHODS, ...PASSIVE_METHODS];
const DEFAULT_CHAIN_ID = 1;
const DEFAULT_CHAIN_KEY = 'ETH';

const extractNamespaceChainId = chainId =>
    chainId && chainId.includes(':') ? chainId.split(':')[1] : chainId;

const getChainIdFromValue = value => {
    if (!value && value !== 0) {
        return null;
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        if (value.startsWith('0x')) {
            return parseInt(value, 16);
        }
        if (/^\d+$/.test(value)) {
            return Number(value);
        }
        const upper = value.toUpperCase();
        if (CHAIN_ID_MAP[upper]) {
            return CHAIN_ID_MAP[upper];
        }
    }
    return null;
};

const getChainKeyFromValue = value => {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    if (CHAIN_ID_TYPE_MAP[value]) {
        return CHAIN_ID_TYPE_MAP[value];
    }
    const numeric = getChainIdFromValue(value);
    if (numeric !== null && CHAIN_ID_TYPE_MAP[numeric]) {
        return CHAIN_ID_TYPE_MAP[numeric];
    }
    const upper = value.toString().toUpperCase();
    return CHAIN_ID_MAP[upper] ? upper : null;
};

export default function DAppsDetailScreen({ navigation, route }) {
    const { item } = route.params;
    const { theme } = useSelector(state => state.ThemeReducer);
    const { walletConnectSites } = useSelector(state => state.WalletConnectReducer);
    const dispatch = useDispatch();
    const { t } = useTranslation();

    const approvalSessionModal = useRef(null);
    const approvalRequestModal = useRef(null);
    const networkRequestModal = useRef(null);
    const webRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [uri, setUri] = useState('');
    const [pairingProposal, setPairingProposal] = useState(null);
    const [requestEventData, setRequestEventData] = useState(null);
    const [requestSession, setRequestSession] = useState(null);
    const [requiredNamespaces, setRequiredNamespaces] = useState({});
    const [activeChain, setActiveChain] = useState('');
    const [networkRequestEvent, setNetworkRequestEvent] = useState(null);
    const [networkRequestInfo, setNetworkRequestInfo] = useState(null);

    // Initialize WalletConnect
    useEffect(() => {
        const initWalletConnect = async () => {
            try {
                console.log('Initializing WalletConnect...');
                await createWeb3Wallet();
                web3wallet.on('session_proposal', onSessionProposal);
                web3wallet.on('session_request', onSessionRequest);
                web3wallet.on('session_delete', onSessionDelete);
                console.log('WalletConnect initialized successfully');
            } catch (error) {
                console.error('WalletConnect initialization failed:', error);
                CommonAlert.show({
                    title: t('alert.error'),
                    message: t('walletconnect.init_error'),
                    type: 'error',
                });
            } finally {
                CommonLoading.hide();
            }
        };

        initWalletConnect();
        return () => {
            console.log('Cleaning up WalletConnect listeners');
            web3wallet.off('session_proposal', onSessionProposal);
            web3wallet.off('session_request', onSessionRequest);
            web3wallet.off('session_delete', onSessionDelete);
        };
    }, [t]);

    // Handle session deletion
    const onSessionDelete = useCallback(() => {
        console.log('Session deleted');
        setLoading(false);
        setUri('');
        setPairingProposal(null);
        setRequestEventData(null);
        setRequestSession(null);
        dispatch(WalletConnectAction.remove(uri));
        CommonAlert.show({
            title: t('walletconnect.session_disconnected'),
            message: t('walletconnect.session_disconnected_message'),
            type: 'info',
        });
    }, [uri, dispatch, t]);

    // Improved JavaScript injection for WalletConnect URI extraction
    const injectedJavaScript = `
    (function() {
      console.log('Injecting JavaScript for WalletConnect URI extraction');
      let open = false;
      const attemptUriExtraction = () => {
        try {
          // Standard WalletConnect modal
          const wcmModal = document.querySelector('body wcm-modal');
          if (wcmModal) {
            const wcmRouter = wcmModal.shadowRoot?.querySelector('wcm-modal-router');
            const wcmQrCodeView = wcmRouter?.shadowRoot?.querySelector('wcm-qrcode-view');
            const wcmModalContent = wcmQrCodeView?.shadowRoot?.querySelector('wcm-modal-content');
            const wcmWalletConnectQr = wcmModalContent?.querySelector('wcm-walletconnect-qr');
            const qrCode = wcmWalletConnectQr?.shadowRoot?.querySelector('wcm-qrcode');
            const uri = qrCode?.getAttribute('uri');
            if (uri) {
              console.log('Found WalletConnect URI:', uri);
              window.ReactNativeWebView.postMessage(uri);
              return true;
            }
          }
          // Fallback for other DApp implementations
          const uriElements = document.querySelectorAll('[data-wc-uri], [uri], [data-uri]');
          for (let el of uriElements) {
            const uri = el.getAttribute('data-wc-uri') || el.getAttribute('uri') || el.getAttribute('data-uri');
            if (uri && uri.startsWith('wc:')) {
              console.log('Found fallback WalletConnect URI:', uri);
              window.ReactNativeWebView.postMessage(uri);
              return true;
            }
          }
          // Fallback for direct URI in DOM
          const textNodes = document.evaluate("//text()[contains(., 'wc:')]", document, null, XPathResult.ANY_TYPE, null);
          let node = textNodes.iterateNext();
          while (node) {
            if (node.textContent.includes('wc:')) {
              const match = node.textContent.match(/wc:[^@]+@2/);
              if (match) {
                console.log('Found text-based WalletConnect URI:', match[0]);
                window.ReactNativeWebView.postMessage(match[0]);
                return true;
              }
            }
            node = textNodes.iterateNext();
          }
          return false;
        } catch (error) {
          console.error('URI extraction error:', error);
          window.ReactNativeWebView.postMessage('Error: ' + error.message);
          return false;
        }
      };

      const observer = new MutationObserver(() => {
        if (!open) {
          open = true;
          setTimeout(() => {
            if (attemptUriExtraction()) {
              observer.disconnect();
            }
          }, 500);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      window.addEventListener('click', () => attemptUriExtraction());
    })();
    true;
  `;

    // Handle WebView errors
    const onBrowserError = useCallback(
        syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error:', nativeEvent);
            CommonAlert.show({
                title: t('alert.error'),
                message: t('webview.error'),
                type: 'error',
            });
            CommonLoading.hide();
        },
        [handlePassiveRequest, onRejectRequest, t],
    );

    // Handle WebView messages
    const onBrowserMessage = useCallback(
        async event => {
            const data = event.nativeEvent.data;
            console.log('Received WebView message:', data);
            if (data.startsWith('Error')) {
                console.error('WebView message error:', data);
                CommonAlert.show({
                    title: t('alert.error'),
                    message: data,
                    type: 'error',
                });
                CommonLoading.hide();
                return;
            }

            if (!loading && data.startsWith('wc:')) {
                setLoading(true);
                try {
                    console.log('Attempting to pair with URI:', data);
                    await pair(data);
                } catch (error) {
                    console.error('Pairing error:', error);
                    CommonAlert.show({
                        title: t('alert.error'),
                        message: t('walletconnect.pairing_error'),
                        type: 'error',
                    });
                } finally {
                    setLoading(false);
                    CommonLoading.hide();
                }
            }
        },
        [loading, t],
    );

    const handlePassiveRequest = useCallback(
        async requestEvent => {
            try {
                const { request } = requestEvent.params;
                const method = request.method;
                const namespaceChainId = requestEvent?.params?.chainId;
                const extractedChainId = extractNamespaceChainId(namespaceChainId);
                let resolvedChainValue = extractedChainId || activeChain || DEFAULT_CHAIN_ID;
                let resolvedChainId =
                    getChainIdFromValue(resolvedChainValue) || DEFAULT_CHAIN_ID;
                let resolvedChainKey =
                    getChainKeyFromValue(resolvedChainValue) || DEFAULT_CHAIN_KEY;
                let wallet = null;

                if (method === EIP155_SIGNING_METHODS.WALLET_SWITCH_ETHEREUM_CHAIN) {
                    const chainParam = request.params?.[0];
                    const desiredChain =
                        chainParam?.chainId || chainParam?.chainIdHex || chainParam;
                    const parsedChainId = getChainIdFromValue(desiredChain);
                    if (!parsedChainId) {
                        throw new Error('Invalid chain requested by DApp');
                    }
                    const parsedChainKey =
                        CHAIN_ID_TYPE_MAP[parsedChainId] ||
                        getChainKeyFromValue(parsedChainId) ||
                        DEFAULT_CHAIN_KEY;
                    wallet = await WalletFactory.getWallet(parsedChainKey);
                    if (!wallet) {
                        throw new Error('Requested chain is not available in wallet');
                    }
                    setActiveChain(parsedChainId.toString());
                    resolvedChainId = parsedChainId;
                    resolvedChainKey = parsedChainKey;
                }

                if (!wallet) {
                    wallet = await WalletFactory.getWallet(resolvedChainKey);
                }

                if (!wallet) {
                    throw new Error(`Wallet not found for chain: ${resolvedChainKey}`);
                }

                const response = await approveEIP155Request(
                    requestEvent,
                    wallet.signer,
                    {
                        chainId: resolvedChainId,
                        chainIdHex: `0x${resolvedChainId.toString(16)}`,
                    },
                );
                await web3wallet.respondSessionRequest({
                    topic: requestEvent.topic,
                    response,
                });
            } catch (error) {
                console.error('Auto approval failed:', error);
                CommonAlert.show({
                    title: t('alert.error'),
                    message: error.message || t('walletconnect.request_approval_error'),
                    type: 'error',
                });
                await onRejectRequest(requestEvent);
            }
        },
        [activeChain, onRejectRequest, t],
    );

    const resetNetworkRequestState = useCallback(() => {
        setNetworkRequestEvent(null);
        setNetworkRequestInfo(null);
    }, []);

    const handleChainManagementRequest = useCallback(
        (requestEvent, sessionData) => {
            try {
                const { request } = requestEvent.params;
                if (!request?.params?.length) {
                    throw new Error('Missing chain parameters');
                }
                const chainParams = request.params[0] || {};
                const chainValue =
                    chainParams.chainIdHex ||
                    chainParams.chainId ||
                    chainParams.chainIdDecimal ||
                    chainParams;
                const numericChainId = getChainIdFromValue(chainValue);
                const chainKey = getChainKeyFromValue(chainValue);
                const metadata =
                    requestEvent?.params?.requester?.metadata ||
                    sessionData?.peer?.metadata ||
                    pairingProposal?.params?.proposer?.metadata ||
                    {};

                setNetworkRequestInfo({
                    method: request.method,
                    type:
                        request.method ===
                        EIP155_SIGNING_METHODS.WALLET_SWITCH_ETHEREUM_CHAIN
                            ? 'switch'
                            : 'add',
                    chainId: numericChainId,
                    chainIdHex: chainValue,
                    chainKey,
                    params: chainParams,
                    dappName: metadata?.name || 'Unknown DApp',
                    dappUrl: metadata?.url || '',
                });
                setNetworkRequestEvent(requestEvent);
                networkRequestModal.current?.show();
            } catch (error) {
                console.error('Failed to prepare chain management request:', error);
                CommonAlert.show({
                    title: t('alert.error'),
                    message: error.message || 'Invalid network request',
                    type: 'error',
                });
                onRejectRequest(requestEvent);
            }
        },
        [onRejectRequest, pairingProposal, t],
    );

    const onApproveNetworkRequest = useCallback(async () => {
        if (!networkRequestEvent) {
            return;
        }
        try {
            CommonLoading.show();
            const { request } = networkRequestEvent.params;
            let response = null;

            if (request.method === EIP155_SIGNING_METHODS.WALLET_SWITCH_ETHEREUM_CHAIN) {
                const chainParams = request.params?.[0] || {};
                const chainValue =
                    chainParams.chainIdHex ||
                    chainParams.chainId ||
                    chainParams.chainIdDecimal ||
                    chainParams;
                const parsedChainId = getChainIdFromValue(chainValue);
                if (!parsedChainId) {
                    throw new Error('Invalid chain requested');
                }
                const targetChainKey =
                    CHAIN_ID_TYPE_MAP[parsedChainId] ||
                    getChainKeyFromValue(chainValue) ||
                    DEFAULT_CHAIN_KEY;
                const wallet = await WalletFactory.getWallet(targetChainKey);
                if (!wallet) {
                    throw new Error('Requested chain is not available in wallet');
                }
                setActiveChain(parsedChainId.toString());
                response = await approveEIP155Request(
                    networkRequestEvent,
                    wallet.signer,
                    {
                        chainId: parsedChainId,
                        chainIdHex: `0x${parsedChainId.toString(16)}`,
                    },
                );
            } else if (request.method === EIP155_SIGNING_METHODS.WALLET_ADD_ETHEREUM_CHAIN) {
                const chainParams = request.params?.[0] || {};
                const chainValue =
                    chainParams.chainIdHex ||
                    chainParams.chainId ||
                    chainParams.chainIdDecimal ||
                    chainParams;
                const parsedChainId = getChainIdFromValue(chainValue);
                if (!parsedChainId) {
                    throw new Error('Invalid chain details provided');
                }
                if (!CHAIN_ID_TYPE_MAP[parsedChainId]) {
                    throw new Error('Requested chain is not supported by this wallet');
                }
                response = await approveEIP155Request(
                    networkRequestEvent,
                    null,
                    {
                        chainId: parsedChainId,
                        chainIdHex: `0x${parsedChainId.toString(16)}`,
                    },
                );
            }

            if (!response) {
                throw new Error('Unsupported network request');
            }

            await web3wallet.respondSessionRequest({
                topic: networkRequestEvent.topic,
                response,
            });
            networkRequestModal.current?.hide();
            resetNetworkRequestState();
        } catch (error) {
            console.error('Network request approval failed:', error);
            CommonAlert.show({
                title: t('alert.error'),
                message: error.message || t('walletconnect.request_approval_error'),
                type: 'error',
            });
        } finally {
            CommonLoading.hide();
        }
    }, [networkRequestEvent, resetNetworkRequestState, t]);

    const onRejectNetworkRequest = useCallback(async () => {
        if (!networkRequestEvent) {
            return;
        }
        try {
            CommonLoading.show();
            const response = rejectEIP155Request(networkRequestEvent);
            await web3wallet.respondSessionRequest({
                topic: networkRequestEvent.topic,
                response,
            });
            networkRequestModal.current?.hide();
            resetNetworkRequestState();
        } catch (error) {
            console.error('Network request rejection failed:', error);
            CommonAlert.show({
                title: t('alert.error'),
                message: t('walletconnect.request_rejection_error'),
                type: 'error',
            });
        } finally {
            CommonLoading.hide();
        }
    }, [networkRequestEvent, resetNetworkRequestState, t]);

    // Pair with WalletConnect URI
    const pair = useCallback(
        async wcUri => {
            try {
                const cleanUri = wcUri.replace('amp;', '');
                console.log('Pairing with cleaned URI:', cleanUri);
                setUri(getUri(cleanUri));
                await onConnect({ uri: cleanUri });
                console.log('Pairing successful');
            } catch (error) {
                console.error('WalletConnect pairing failed:', error);
                CommonAlert.show({
                    title: t('alert.error'),
                    message: t('walletconnect.pairing_error'),
                    type: 'error',
                });
                throw error;
            }
        },
        [handleChainManagementRequest, handlePassiveRequest, onRejectRequest, t],
    );

    // Handle session proposal
    const onSessionProposal = useCallback(
        proposal => {
            console.log('Received session proposal:', JSON.stringify(proposal, null, 2));
            setPairingProposal(proposal);
            const { params } = proposal;
            const { requiredNamespaces, optionalNamespaces } = params;
            const currentNamespaces = _.isEmpty(requiredNamespaces)
                ? optionalNamespaces
                : requiredNamespaces;
            setRequiredNamespaces(currentNamespaces);

            const chains = currentNamespaces.eip155?.chains || [];
            if (!chains.length) {
                console.error('No chains provided in session proposal');
                CommonAlert.show({
                    title: t('alert.error'),
                    message: t('walletconnect.no_chains'),
                    type: 'error',
                });
                return;
            }

            setActiveChain(chains[0].split(':')[1] || '1'); // Default to Ethereum mainnet
            approvalSessionModal.current?.show();
        },
        [t],
    );

    // Handle session request
    const onSessionRequest = useCallback(
        async requestEvent => {
            console.log('Received session request:', JSON.stringify(requestEvent, null, 2));
            const { topic, params } = requestEvent;
            const { request } = params;
            const session = web3wallet.engine.signClient.session.get(topic);

            if (!session) {
                console.error('Invalid session for request:', topic);
                CommonAlert.show({
                    title: t('alert.error'),
                    message: t('walletconnect.invalid_session'),
                    type: 'error',
                });
                return;
            }

            setRequestSession(session);
            setRequestEventData(requestEvent);

            if (CHAIN_MANAGEMENT_METHODS.includes(request.method)) {
                handleChainManagementRequest(requestEvent, session);
                return;
            }

            if (AUTO_APPROVED_METHODS.includes(request.method)) {
                await handlePassiveRequest(requestEvent);
                return;
            }

            if (SIGNING_METHODS.includes(request.method)) {
                approvalRequestModal.current?.show();
            } else {
                console.warn('Unsupported method:', request.method);
                CommonAlert.show({
                    title: t('alert.error'),
                    message: t('walletconnect.unsupported_method'),
                    type: 'error',
                });
                await onRejectRequest(requestEvent);
            }
        },
        [t],
    );

    // Approve session
    const handleAccept = useCallback(async () => {
        if (!pairingProposal) {
            console.error('No pairing proposal available');
            return;
        }

        try {
            CommonLoading.show();
            const { id, params } = pairingProposal;
            const { requiredNamespaces, optionalNamespaces, relays } = params;
            const currentNamespaces = _.isEmpty(requiredNamespaces)
                ? optionalNamespaces
                : requiredNamespaces;

            const chainIdValue = getChainIdFromValue(activeChain) || DEFAULT_CHAIN_ID;
            const chainKey =
                CHAIN_ID_TYPE_MAP[chainIdValue] ||
                getChainKeyFromValue(activeChain) ||
                DEFAULT_CHAIN_KEY;
            console.log('Approving session for chain:', chainIdValue);
            const wallet = await WalletFactory.getWallet(chainKey);

            if (!wallet) {
                console.error('Wallet not found for chain:', chainKey);
                CommonAlert.show({
                    title: t('alert.error'),
                    message: t('walletconnect.unsupported_network'),
                    type: 'error',
                });
                return;
            }

            const namespaces = {};
            Object.keys(currentNamespaces).forEach(key => {
                const accounts = currentNamespaces[key].chains.map(chain =>
                    `${chain}:${wallet.data.walletAddress}`,
                );
                namespaces[key] = {
                    accounts,
                    methods: currentNamespaces[key].methods,
                    events: currentNamespaces[key].events,
                };
            });

            const approveSession = {
                id,
                relayProtocol: relays[0].protocol,
                namespaces,
            };

            console.log('Approving session:', JSON.stringify(approveSession, null, 2));
            await web3wallet.approveSession(approveSession);
            dispatch(
                WalletConnectAction.add({
                    [uri]: {
                            chain: chainKey,
                        approveSession,
                        pairingProposal,
                    },
                }),
            );
            console.log('Session approved successfully');
            approvalSessionModal.current?.hide();
        } catch (error) {
            console.error('Session approval failed:', error);
            CommonAlert.show({
                title: t('alert.error'),
                message: t('walletconnect.approval_error'),
                type: 'error',
            });
        } finally {
            CommonLoading.hide();
        }
    }, [pairingProposal, activeChain, uri, dispatch, t]);

    // Reject session
    const handleDecline = useCallback(async () => {
        if (!pairingProposal) {
            console.error('No pairing proposal to reject');
            return;
        }

        try {
            console.log('Rejecting session:', pairingProposal.id);
            await web3wallet.rejectSession({
                id: pairingProposal.id,
                reason: getSdkError('USER_REJECTED_METHODS'),
            });
            approvalSessionModal.current?.hide();
            console.log('Session rejected successfully');
        } catch (error) {
            console.error('Session rejection failed:', error);
            CommonAlert.show({
                title: t('alert.error'),
                message: t('walletconnect.rejection_error'),
                type: 'error',
            });
        }
    }, [pairingProposal, t]);

    // Approve request
    const onApproveRequest = useCallback(async () => {
        if (!requestEventData || !activeChain) {
            console.error('No request event data or active chain');
            return;
        }

        try {
            CommonLoading.show();
            const targetChain = getChainKeyFromValue(activeChain) || DEFAULT_CHAIN_KEY;
            const wallet = await WalletFactory.getWallet(targetChain);
            if (!wallet) {
                throw new Error('Wallet not found for chain: ' + targetChain);
            }

            console.log('Approving request:', JSON.stringify(requestEventData, null, 2));
            const response = await approveEIP155Request(requestEventData, wallet.signer);
            await web3wallet.respondSessionRequest({
                topic: requestEventData.topic,
                response,
            });
            console.log('Request approved successfully');
            approvalRequestModal.current?.hide();
        } catch (error) {
            console.error('Request approval failed:', error);
            CommonAlert.show({
                title: t('alert.error'),
                message: t('walletconnect.request_approval_error'),
                type: 'error',
            });
        } finally {
            CommonLoading.hide();
        }
    }, [requestEventData, activeChain, t]);

    // Reject request
    const onRejectRequest = useCallback(
        async (event = requestEventData) => {
            if (!event) {
                console.error('No request event to reject');
                return;
            }

            try {
                CommonLoading.show();
                console.log('Rejecting request:', event.id);
                const response = rejectEIP155Request(event);
                await web3wallet.respondSessionRequest({
                    topic: event.topic,
                    response,
                });
                console.log('Request rejected successfully');
                approvalRequestModal.current?.hide();
            } catch (error) {
                console.error('Request rejection failed:', error);
                CommonAlert.show({
                    title: t('alert.error'),
                    message: t('walletconnect.request_rejection_error'),
                    type: 'error',
                });
            } finally {
                CommonLoading.hide();
            }
        },
        [requestEventData, t],
    );

    // Handle WebView navigation
    const onShouldStartLoad = useCallback(
        event => {
            const url = event.url;
            console.log('WebView navigating to:', url);
            if (!url.startsWith('https:')) {
                if (!loading) {
                    setLoading(true);
                    try {
                        const currentSite = walletConnectSites[getUri(url)];
                        if (!currentSite) {
                            console.log('New WalletConnect URI detected, pairing:', url);
                            pair(url);
                        } else {
                            console.log('Restoring existing session for URI:', url);
                            setActiveChain(currentSite.chain);
                            setUri(getUri(url));
                            setPairingProposal(currentSite.pairingProposal);
                            setRequiredNamespaces(
                                _.isEmpty(currentSite.pairingProposal.params.requiredNamespaces)
                                    ? currentSite.pairingProposal.params.optionalNamespaces
                                    : currentSite.pairingProposal.params.requiredNamespaces,
                            );
                            setRequestSession(currentSite.requestSession);
                        }
                    } catch (error) {
                        console.error('Navigation handling error:', error);
                        CommonAlert.show({
                            title: t('alert.error'),
                            message: t('walletconnect.navigation_error'),
                            type: 'error',
                        });
                    } finally {
                        setLoading(false);
                    }
                }
                return false;
            }
            return true;
        },
        [loading, walletConnectSites, pair, t],
    );

    // Extract WalletConnect URI
    const getUri = url => {
        const match = url.match(/wc:([^@]+)@2/);
        const extractedUri = match?.[1] || '';
        console.log('Extracted URI:', extractedUri);
        return extractedUri;
    };

    // Custom user agent for WebView to mimic a browser
    const userAgent = Platform.select({
        ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        android:
            'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36',
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background4 }]}>
            <View style={styles.header}>
                <View style={styles.leftHeader}>
                    <CommonBackButton
                        onPress={() => navigation.goBack()}
                        color={theme.text}
                    />
                </View>
                <View style={styles.contentHeader}>
                    <CommonText style={styles.headerTitle}>{item.name}</CommonText>
                </View>
            </View>
            <View style={styles.content}>
                <WebView
                    ref={webRef}
                    originWhitelist={['*']}
                    source={{ uri: item.url }}
                    onError={onBrowserError}
                    onMessage={onBrowserMessage}
                    onShouldStartLoadWithRequest={onShouldStartLoad}
                    setSupportMultipleWindows={false}
                    renderLoading={() => <ActivityIndicator size="large" color={theme.primary} />}
                    injectedJavaScript={injectedJavaScript}
                    javaScriptEnabled
                    domStorageEnabled
                    allowFileAccess
                    allowUniversalAccessFromFileURLs
                    allowingReadAccessToURL={item.url}
                    mixedContentMode="always"
                    thirdPartyCookiesEnabled
                    userAgent={userAgent}
                    onConsoleMessage={e => console.log('WebView console:', e.message)}
                />
            </View>
            <ActionSheet
                ref={approvalSessionModal}
                headerAlwaysVisible
                isModal={Platform.OS === 'android'}
                useBottomSafeAreaPadding
                containerStyle={[styles.sessionRequestContainer, { backgroundColor: theme.background4 }]}
            >
                <SafeAreaView>
                    <View style={styles.titleContainer}>
                        <CommonText style={{ fontWeight: 'bold', fontSize: 17 }}>
                            {pairingProposal?.params?.proposer?.metadata?.name || 'Unknown DApp'}
                        </CommonText>
                        <CommonText>{t('walletconnect.connect_request')}</CommonText>
                        <CommonText>{pairingProposal?.params?.proposer?.metadata?.url || 'No URL'}</CommonText>
                    </View>
                    <View style={styles.contentContainer}>
                        <CommonText>{t('walletconnect.requested_permissions')}</CommonText>
                        {requiredNamespaces?.eip155?.chains?.map(chain => (
                            <CommonText key={chain}>{chain.toUpperCase()}</CommonText>
                        ))}
                        {requiredNamespaces?.eip155?.methods?.map(method => (
                            <CommonText key={method}>{method}</CommonText>
                        ))}
                        {requiredNamespaces?.eip155?.events?.map(event => (
                            <CommonText key={event}>{event}</CommonText>
                        ))}
                    </View>
                    <View style={styles.buttonContainer}>
                        <View style={styles.haftButton}>
                            <CommonButton
                                text={t('approve')}
                                onPress={handleAccept}
                                style={[styles.button, { backgroundColor: theme.longColor }]}
                            />
                        </View>
                        <View style={styles.haftButton}>
                            <CommonButton
                                text={t('reject')}
                                style={[styles.button, { backgroundColor: theme.text3 }]}
                                onPress={handleDecline}
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </ActionSheet>
            <ActionSheet
                ref={approvalRequestModal}
                headerAlwaysVisible
                isModal={Platform.OS === 'android'}
                useBottomSafeAreaPadding
                containerStyle={[styles.sessionRequestContainer, { backgroundColor: theme.background }]}
            >
                <View style={styles.titleContainer}>
                    <CommonText style={{ fontWeight: 'bold', fontSize: 17 }}>
                        {pairingProposal?.params?.proposer?.metadata?.name || 'Unknown DApp'}
                    </CommonText>
                    <CommonText>{t('walletconnect.connect_request')}</CommonText>
                    <CommonText>{pairingProposal?.params?.proposer?.metadata?.url || 'No URL'}</CommonText>
                </View>
                <View style={styles.contentContainer}>
                    {requestEventData && (
                        <CommonText>
                            {t(
                                requestEventData?.params?.request?.method === 'personal_sign'
                                    ? 'walletconnect.sign_message'
                                    : 'walletconnect.send_transaction',
                            )}
                        </CommonText>
                    )}
                    {requestEventData && (
                        <CommonText>
                            {JSON.stringify(getSignParamsMessage(requestEventData?.params?.request?.params), null, 2)}
                        </CommonText>
                    )}
                </View>
                <View style={styles.buttonContainer}>
                    <View style={styles.haftButton}>
                        <CommonButton text={t('approve')} onPress={onApproveRequest} />
                    </View>
                    <View style={styles.haftButton}>
                        <CommonButton
                            text={t('reject')}
                            style={[styles.button, { backgroundColor: theme.text3 }]}
                            onPress={onRejectRequest}
                        />
                    </View>
                </View>
            </ActionSheet>
            <ActionSheet
                ref={networkRequestModal}
                headerAlwaysVisible
                isModal={Platform.OS === 'android'}
                useBottomSafeAreaPadding
                containerStyle={[styles.sessionRequestContainer, { backgroundColor: theme.background4 }]}
            >
                <SafeAreaView>
                    <View style={styles.titleContainer}>
                        <CommonText style={{ fontWeight: 'bold', fontSize: 17 }}>
                            {networkRequestInfo?.dappName || 'Unknown DApp'}
                        </CommonText>
                        {!!networkRequestInfo?.dappUrl && (
                            <CommonText>{networkRequestInfo.dappUrl}</CommonText>
                        )}
                        <CommonText>
                            {networkRequestInfo?.type === 'switch'
                                ? 'Network switch requested'
                                : 'Add network requested'}
                        </CommonText>
                    </View>
                    <View style={styles.contentContainer}>
                        <CommonText>{`Chain ID: ${networkRequestInfo?.chainId ?? 'Unknown'}`}</CommonText>
                        <CommonText>{`Chain Key: ${networkRequestInfo?.chainKey ?? 'Unknown'}`}</CommonText>
                        {networkRequestInfo?.params?.chainName && (
                            <CommonText>{`Name: ${networkRequestInfo.params.chainName}`}</CommonText>
                        )}
                        {networkRequestInfo?.params?.nativeCurrency?.symbol && (
                            <CommonText>{`Currency: ${networkRequestInfo.params.nativeCurrency.symbol}`}</CommonText>
                        )}
                        {networkRequestInfo?.params?.rpcUrls?.length ? (
                            <CommonText numberOfLines={2} style={{ textAlign: 'center' }}>
                                {`RPC: ${networkRequestInfo.params.rpcUrls[0]}`}
                            </CommonText>
                        ) : null}
                    </View>
                    <View style={styles.buttonContainer}>
                        <View style={styles.haftButton}>
                            <CommonButton
                                text={t('approve')}
                                onPress={onApproveNetworkRequest}
                                style={[styles.button, { backgroundColor: theme.longColor }]}
                            />
                        </View>
                        <View style={styles.haftButton}>
                            <CommonButton
                                text={t('reject')}
                                style={[styles.button, { backgroundColor: theme.text3 }]}
                                onPress={onRejectNetworkRequest}
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </ActionSheet>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 48,
        paddingHorizontal: 10,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftHeader: {
        width: 30,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    contentHeader: {
        flex: 1,
        justifyContent: 'center',
        height: '100%',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    sessionRequestContainer: {
        width: '100%',
        marginBottom: Platform.OS === 'android' ? 0 : 170,
    },
    titleContainer: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    contentContainer: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
        minHeight: 200,
    },
    buttonContainer: {
        width: '100%',
        height: 50,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Platform.OS === 'android' ? 0 : 30,
    },
    haftButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        borderRadius: 5,
    },
});