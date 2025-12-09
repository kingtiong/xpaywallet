import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import CommonText from '@components/commons/CommonText';
import ActionSheet from 'react-native-actions-sheet';
import WebView from 'react-native-webview';
import CommonButton from '@components/commons/CommonButton';
import CommonLoading from '@components/commons/CommonLoading';
import CommonBackButton from '@components/commons/CommonBackButton';
import Icon, { Icons } from '@components/icons/Icons';
import SmartContractCallModal from '@components/SmartContractCallModal';
import {
    createWeb3Wallet,
    onConnect,
    web3wallet,
} from '@modules/walletconnect/WalletConnectClient';
import {EIP155_SIGNING_METHODS} from '@modules/walletconnect/EIP155';
import {getSignParamsMessage} from '@modules/walletconnect/HelperUtils';
import {
    approveEIP155Request,
    rejectEIP155Request,
} from '@modules/walletconnect/EIP155Request';
import {WalletFactory} from '@modules/core/factory/WalletFactory';
import {getSdkError} from '@walletconnect/utils';
import _ from 'lodash';
import {CHAIN_ID_TYPE_MAP} from '@modules/core/constant/constant';
import {WalletConnectAction} from '@persistence/walletconnect/WalletConnectAction';
import CommonAlert from '@components/commons/CommonAlert';
import {useTranslation} from 'react-i18next';
import { ethers } from 'ethers';
import { metaMaskWeb3Provider } from '@modules/web3/MetaMaskProvider';
import Web3RequestModal from '@components/Web3RequestModal';

export default function DAppsDetailScreen({navigation, route}) {
    const {item} = route.params;
    const {theme} = useSelector(state => state.ThemeReducer);
    const approvalSessionModal = useRef(null);
    const approvalRequestModal = useRef(null);
    const [loading, setLoading] = useState(false);
    const [pairingProposal, setPairingProposal] = useState();
    const [requestEventData, setRequestEventData] = useState();
    const [requestSession, setRequestSession] = useState();
    const [requiredNamespaces, setRequiredNamespaces] = useState({});
    const [activeChain, setActiveChain] = useState('');
    const [showSmartContractModal, setShowSmartContractModal] = useState(false);
    const [smartContractTransaction, setSmartContractTransaction] = useState(null);
    const [showWeb3RequestModal, setShowWeb3RequestModal] = useState(false);
    const [web3RequestData, setWeb3RequestData] = useState(null);
    const [web3RequestCallbacks, setWeb3RequestCallbacks] = useState(null);
    const [showNetworkModal, setShowNetworkModal] = useState(false);
    const {t} = useTranslation();
    const {walletConnectSites} = useSelector(
        state => state.WalletConnectReducer,
    );
    const {wallets} = useSelector(state => state.WalletReducer);
    const webRef = useRef(null);
    const [uri, setUri] = useState('');
    const dispatch = useDispatch();
    useEffect(() => {
        let isMounted = true;
        let proposalListener;
        let requestListener;

        (async () => {
            await createWeb3Wallet();
            if (!web3wallet) {
                return;
            }

            proposalListener = proposal => {
                if (!isMounted) {
                    return;
                }
                onSessionProposal(proposal);
            };

            requestListener = requestEvent => {
                if (!isMounted) {
                    return;
                }
                onSessionRequest(requestEvent);
            };

            web3wallet.on('session_proposal', proposalListener);
            web3wallet.on('session_request', requestListener);

            // Setup Web3 provider request callback
            metaMaskWeb3Provider.setRequestCallback(async requestInfo => {
                if (!isMounted) {
                    return;
                }
                console.log(
                    '🔌 Web3 request callback triggered:',
                    requestInfo.requestData.method,
                );
                console.log('🔌 DApp info:', {name: item.name, url: item.url});

                // Handle different types of requests
                const method = requestInfo.requestData.method;

                if (method === 'eth_accounts') {
                    // Handle eth_accounts automatically without showing modal
                    console.log('🔌 Handling eth_accounts automatically');
                    try {
                        const accounts = await metaMaskWeb3Provider.getAccounts();
                        console.log('🔌 Auto-approved eth_accounts:', accounts);
                        return accounts; // Return directly instead of using callback
                    } catch (error) {
                        console.error('🔌 Error in eth_accounts:', error);
                        throw error; // Throw directly instead of using callback
                    }
                } else if (method === 'eth_requestAccounts') {
                    // Show confirmation modal for eth_requestAccounts (connection request)
                    console.log(
                        '🔌 Showing confirmation modal for eth_requestAccounts',
                    );
                    if (!isMounted) {
                        return;
                    }
                    setWeb3RequestData(requestInfo.requestData);
                    setWeb3RequestCallbacks({
                        onApprove: async data => {
                            const result = await requestInfo.onApprove(data);
                            return result;
                        },
                        onReject: requestInfo.onReject,
                    });
                    setShowWeb3RequestModal(true);
                } else if (
                    method === 'wallet_showAlert' ||
                    method === 'wallet_showConfirm'
                ) {
                    // Show alert/confirm in Web3RequestModal
                    console.log(
                        '🔌 Setting up alert/confirm modal for method:',
                        method,
                    );
                    console.log('🔌 Request data:', requestInfo.requestData);
                    if (!isMounted) {
                        return;
                    }
                    setWeb3RequestData(requestInfo.requestData);
                    setWeb3RequestCallbacks({
                        onApprove: requestInfo.onApprove,
                        onReject: requestInfo.onReject,
                    });
                    console.log('🔌 Setting Web3RequestModal visibility to TRUE');
                    setShowWeb3RequestModal(true);
                    console.log('🔌 Web3RequestModal visibility should now be TRUE');
                } else if (method === 'eth_sendTransaction') {
                    // Show SmartContractCallModal for transactions
                    if (!isMounted) {
                        return;
                    }
                    setSmartContractTransaction(requestInfo.requestData);
                    setShowSmartContractModal(true);
                } else {
                    // Show Web3RequestModal for other requests
                    if (!isMounted) {
                        return;
                    }
                    setWeb3RequestData(requestInfo.requestData);
                    setWeb3RequestCallbacks({
                        onApprove: requestInfo.onApprove,
                        onReject: requestInfo.onReject,
                    });
                    setShowWeb3RequestModal(true);
                }

                console.log('🔌 Modal should be showing now');
            });
        })();
        CommonLoading.hide();
        return () => {
            isMounted = false;
            if (proposalListener && web3wallet?.off) {
                web3wallet.off('session_proposal', proposalListener);
            }
            if (requestListener && web3wallet?.off) {
                web3wallet.off('session_request', requestListener);
            }
            metaMaskWeb3Provider.clearRequestCallback();
        };
    }, [item.name, item.url, onSessionProposal, onSessionRequest]);
    useEffect(() => {
        if (!web3wallet) {
            return;
        }
        web3wallet.on('session_delete', onSessionDelete);
        return () => {
            if (web3wallet?.off) {
                web3wallet.off('session_delete', onSessionDelete);
            }
        };
    }, [uri, onSessionDelete]);
    const injectedJavaScriptIos = `
          //window.localStorage.clear();
          var open = false;
         (function(){
              var elements = document.querySelectorAll('*');
              elements.forEach(function(element) {
              element.addEventListener('click', function(event) {
                console.log('Click event triggered:', event);
                console.log('Click event triggered:', event.target.tagName);
                if((event.target.tagName.includes("WCM-MODAL")) && open == false){
                   open = true;
                   setTimeout(()=>{
                   try{
                     var wcmModal = document.querySelector('body wcm-modal');
                     var wcmRouter = wcmModal.shadowRoot.querySelector('wcm-modal-router');
                     var wcmQrCodeView = wcmRouter.shadowRoot.querySelector('wcm-qrcode-view');
                     var wcmModalContent = wcmQrCodeView.shadowRoot.querySelector('wcm-modal-content'); 
                     var wcmWalletConnectQr = wcmModalContent.querySelector("wcm-walletconnect-qr");
                     var qrCode = wcmWalletConnectQr.shadowRoot.querySelector("wcm-qrcode");
                     const innerHTML = qrCode.getAttribute("uri");
                     window.ReactNativeWebView.postMessage(innerHTML);
                 
                   }catch(error){
                      window.ReactNativeWebView.postMessage(error);
                   }
                   
                   },500)
                   
                }
                // Perform any desired actions here
              });
            });
            
        })();
        true; // note: this is required, or you'll sometimes get silent failures   
    `;
    const injectedJavaScriptAndroid = `
          var open = false;
         (function(){
              // window.localStorage.clear();
              var elements = document.querySelectorAll('*');
              elements.forEach(function(element) {
              element.addEventListener('click', function(event) {
                console.log('Click event triggered:', event);
                console.log('Click event triggered:', event.target.tagName);
                if((event.target.tagName.includes("WCM-MODAL")) && open == false){
                   open = true;
                   setTimeout(()=>{
                   try{
                     var htmlString = document.querySelector('body wcm-modal').getInnerHTML();
                   
                   // Regular expression pattern to match the uri attribute
                    var pattern = /uri="([^"]+)"/;
                    
                    // Use the match method to find the uri attribute value
                    var match = htmlString.match(pattern);
                    
                    // Check if a match is found and retrieve the uri value
                    if (match && match[1]) {
                      var uri = match[1];
                      console.log(uri);
                      window.ReactNativeWebView.postMessage(uri);
                    } else {
                      console.error("URI attribute not found or invalid HTML string.");
                    }
                   }catch(error){
                      window.ReactNativeWebView.postMessage(error);
                   }
                   
                   },500)
                   
                }
                // Perform any desired actions here
              });
            });
            
        })();
        true; // note: this is required, or you'll sometimes get silent failures   
    `;
    // called when there is an error in the browser
    const onBrowserError = syntheticEvent => {
        const {nativeEvent} = syntheticEvent;
        console.warn('WebView error: ', nativeEvent);
        CommonLoading.hide();
    };
    const onBrowserMessage = async event => {
        try {
            CommonLoading.show();
            
            // Check if this is a Web3 provider request
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'eth_request') {
                console.log('🔌 Handling Web3 request with MetaMask provider:', data);
                
                try {
                    const response = await metaMaskWeb3Provider.handleWeb3Request(data);
                    
                    // Only send response if it's not a user interaction request
                    // User interaction requests will be handled by the modal callbacks
                    if (response !== undefined) {
                        // Prepare response data
                        const responseData = {
                            type: 'eth_response',
                            method: data.method, // Include method name for proper handling
                            id: data.id,
                            result: response,
                            messageId: data.messageId
                        };
                        
                        // Send response back to WebView using window.postMessage
                        webRef.current?.postMessage(JSON.stringify(responseData));
                        // Also try window.postMessage for compatibility
                        webRef.current?.injectJavaScript(`window.postMessage('${JSON.stringify(responseData)}', '*');`);
                        console.log('🔌 MetaMask provider response sent:', responseData);
                    }
                    
                } catch (error) {
                    if (error.message === 'USER_INTERACTION_REQUIRED') {
                        console.log('🔌 User interaction required for method:', data.method);
                        // Handle user interaction methods
                        if (data.method === 'eth_requestAccounts') {
                            console.log('🔌 Showing confirmation modal for eth_requestAccounts');
                            setWeb3RequestData(data);
                            setWeb3RequestCallbacks({
                                onApprove: async (requestData) => {
                                    const accounts = await metaMaskWeb3Provider.getAccounts();
                                    console.log('🔌 User approved eth_requestAccounts:', accounts);
                                    return accounts; // Return the accounts so handleWeb3RequestApprove can use them
                                },
                                onReject: (requestData) => {
                                    console.log('🔌 User rejected eth_requestAccounts');
                                    metaMaskWeb3Provider.sendResponse(webRef, requestData.id, null, 'User rejected the request', requestData.method);
                                }
                            });
                            setShowWeb3RequestModal(true);
                        } else {
                            // Handle other user interaction methods
                            console.log('🔌 Showing modal for method:', data.method);
                            setWeb3RequestData(data);
                            setWeb3RequestCallbacks({
                                onApprove: async (requestData) => {
                                    // For transaction methods, we need to handle them differently
                                    if (requestData.method === 'eth_sendTransaction') {
                                        console.log('🔌 User approved transaction:', requestData.method);
                                        // TODO: Implement transaction signing and get tx hash
                                        const txHash = "0xabc123..."; // Placeholder - implement actual transaction signing
                                        return txHash;
                                    } else {
                                        const accounts = await metaMaskWeb3Provider.getAccounts();
                                        console.log('🔌 User approved request:', requestData.method);
                                        return accounts;
                                    }
                                },
                                onReject: (requestData) => {
                                    console.log('🔌 User rejected request:', requestData.method);
                                    metaMaskWeb3Provider.sendResponse(webRef, requestData.id, null, 'User rejected the request', requestData.method);
                                }
                            });
                            setShowWeb3RequestModal(true);
                        }
                        // Don't hide loading here as we're showing a modal
                        return;
                    } else {
                        // Handle other errors
                        const responseData = {
                            type: 'eth_response',
                            id: data.id,
                            error: error.message,
                            messageId: data.messageId,
                            method: data.method
                        };
                        webRef.current?.postMessage(JSON.stringify(responseData));
                        // Also try window.postMessage for compatibility
                        webRef.current?.injectJavaScript(`window.postMessage('${JSON.stringify(responseData)}', '*');`);
                        console.error('🔌 MetaMask provider error:', error);
                    }
                }
                
                CommonLoading.hide();
                return;
            }
            
            // Handle WalletConnect QR code detection
            if (loading === false) {
                setLoading(true);
                await pair(event.nativeEvent.data);
            }
        } catch (e) {
            console.log(e);
            CommonLoading.hide();
        } finally {
            CommonLoading.hide();
        }
    };

    async function pair(wcUri) {
        const wcUrl = wcUri.replace('amp;', '');
        setUri(getUri(wcUrl));
        
        // Use the deep link handler to properly parse and handle the URI
        const { deepLinkHandler } = await import('@modules/deeplink/DeepLinkHandler');
        deepLinkHandler.handleDeepLink(wcUrl);
    }

    const onSessionProposal = useCallback(proposal => {
        setPairingProposal(proposal);
        console.log(JSON.stringify(proposal));
        const {params} = proposal;
        const {requiredNamespaces: mainNamespaces, optionalNamespaces} = params;
        const currentRequiredNamespaces = _.isEmpty(mainNamespaces)
            ? optionalNamespaces
            : mainNamespaces;
        setRequiredNamespaces(currentRequiredNamespaces);
        approvalSessionModal?.current.show();
    }, []);
    const onSessionRequest = useCallback(async requestEvent => {
        console.log("onSessionRequest");
        console.log(requestEvent);
        const {topic, params} = requestEvent;
        const {request} = params;
        const requestSessionData =
            web3wallet.engine.signClient.session.get(topic);

        switch (request.method) {
            case EIP155_SIGNING_METHODS.ETH_SIGN:
            case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
                setRequestSession(requestSessionData);
                setRequestEventData(requestEvent);
                approvalRequestModal?.current.show();
                return;

            case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
            case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
            case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
                setRequestSession(requestSessionData);
                setRequestEventData(requestEvent);
                approvalRequestModal?.current.show();
                return;
                
            case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
            case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
                // Check if this is a smart contract call
                const transactionData = request.params[0];
                if (isSmartContractCall(transactionData)) {
                    // Show SmartContractCallModal for smart contract calls
                    setSmartContractTransaction({
                        ...transactionData,
                        requestEvent,
                        requestSessionData,
                        method: request.method
                    });
                    setShowSmartContractModal(true);
                } else {
                    // Use existing modal for simple transfers
                    setRequestSession(requestSessionData);
                    setRequestEventData(requestEvent);
                    approvalRequestModal?.current.show();
                }
                return;
        }
    }, []);

    // Check if transaction is a smart contract call
    const isSmartContractCall = (transactionData) => {
        if (!transactionData) return false;
        
        // Check if 'to' address is a contract (has data field)
        if (transactionData.data && transactionData.data !== '0x') {
            return true;
        }
        
        // Check if value is 0 but has data (contract interaction)
        const value = transactionData.value || '0';
        const hasValue = ethers.BigNumber.from(value).gt(0);
        const hasData = transactionData.data && transactionData.data !== '0x';
        
        return !hasValue && hasData;
    };
    const onSessionDelete = () => {
        setLoading(false);
        dispatch(WalletConnectAction.remove(uri));
    };

    // Web3 Request Modal handlers
    const handleWeb3RequestApprove = async (requestData) => {
        console.log('🔌 handleWeb3RequestApprove called');
        console.log('🔌 Request data:', requestData);
        
        try {
            // Check if this is a chain switch request created from an alert
            if (requestData.method === 'wallet_switchEthereumChain' && requestData.type === 'eth_request') {
                console.log('🔌 Handling chain switch request from alert');
                
                // Call the chain switch logic directly instead of going through handleWeb3Request
                const chainParams = requestData.params[0];
                console.log('🔌 Chain switch params:', chainParams);
                
                try {
                    // Call the switchChain method directly
                    const result = await metaMaskWeb3Provider.switchChain(chainParams);
                    console.log('🔌 Direct chain switch result:', result);
                    
                    // Update chain state
                    const chainId = chainParams.chainId;
                    const chainName = metaMaskWeb3Provider.getChainNameFromId(chainId);
                    if (chainName) {
                        metaMaskWeb3Provider.setCurrentChain(chainName);
                        setActiveChain(chainName);
                        console.log('🔌 Updated chain state to:', chainName);
                        
                        // Send chain change confirmation to WebView
                        webRef.current?.postMessage(JSON.stringify({
                            type: 'chain_change_confirmed',
                            chainId: chainId,
                            chainName: chainName,
                            timestamp: Date.now()
                        }));
                        console.log('🔌 Chain change confirmation sent to WebView:', { chainId, chainName });
                    }
                    
                    // Send success response using sendResponse method
                    metaMaskWeb3Provider.sendResponse(webRef, requestData.id, null, null, requestData.method);
                    console.log('🔌 Chain switch success response sent');
                    
                } catch (switchError) {
                    console.error('🔌 Chain switch failed:', switchError);
                    
                    // Send error response using sendResponse method
                    metaMaskWeb3Provider.sendResponse(webRef, requestData.id, null, switchError.message || 'Chain switch failed', requestData.method);
                    console.log('🔌 Chain switch error response sent');
                }
                
                console.log('🔌 Chain switch request processing completed');
            } else if (web3RequestCallbacks?.onApprove) {
                // Handle normal requests through the callback
                console.log('🔌 Handling normal request through callback');
                console.log('🔌 Request method:', requestData.method);
                console.log('🔌 Request params:', requestData.params);
                
                try {
                    const result = await web3RequestCallbacks.onApprove(requestData);
                    console.log('🔌 Normal request processing completed with result:', result);
                    console.log('🔌 Result type:', typeof result, 'Result value:', result);
                    
                    // Send response using sendResponse method
                    console.log('🔌 Sending response using sendResponse method');
                    metaMaskWeb3Provider.sendResponse(webRef, requestData.id, result, null, requestData.method);
                    console.log('🔌 Normal request success response sent');
                } catch (callbackError) {
                    console.error('🔌 Error in callback approval:', callbackError);
                    
                    // Send error response using sendResponse method
                    metaMaskWeb3Provider.sendResponse(webRef, requestData.id, null, callbackError.message || 'Request failed', requestData.method);
                    console.log('🔌 Normal request error response sent');
                }
            } else {
                console.warn('🔌 No callback available for request:', requestData.method);
                // Send error response for unsupported requests
                metaMaskWeb3Provider.sendResponse(webRef, requestData.id, null, 'No callback available for this request', requestData.method);
            }
            
        } catch (error) {
            console.error('Error approving Web3 request:', error);
            console.error('Error details:', error.message, error.stack);
            
            // Send error response back to WebView
            metaMaskWeb3Provider.sendResponse(webRef, requestData.id, null, error.message || 'Request failed', requestData.method);
            console.log('🔌 General error response sent');
        } finally {
            console.log('🔌 Closing Web3RequestModal and clearing state');
            setShowWeb3RequestModal(false);
            setWeb3RequestData(null);
            setWeb3RequestCallbacks(null);
            CommonLoading.hide(); // Hide the loading indicator
        }
    };

    const handleWeb3RequestReject = (requestData) => {
        console.log('🔌 handleWeb3RequestReject called');
        try {
            // Send rejection response back to WebView using sendResponse method
            metaMaskWeb3Provider.sendResponse(webRef, requestData.id, null, 'User rejected the request', requestData.method);
            console.log('🔌 Rejection response sent');
            
            // Also call the original reject callback if available
            if (web3RequestCallbacks?.onReject) {
                web3RequestCallbacks.onReject(requestData);
            }
        } catch (error) {
            console.error('Error rejecting Web3 request:', error);
        } finally {
            setShowWeb3RequestModal(false);
            setWeb3RequestData(null);
            setWeb3RequestCallbacks(null);
            CommonLoading.hide(); // Hide the loading indicator
        }
    };

    const handleWeb3RequestClose = () => {
        console.log('🔌 handleWeb3RequestClose called');
        console.log('🔌 Current web3RequestData:', web3RequestData);
        console.log('🔌 Current web3RequestCallbacks:', web3RequestCallbacks);
        
        // Send rejection response back to WebView when modal is closed
        if (web3RequestData) {
            metaMaskWeb3Provider.sendResponse(webRef, web3RequestData.id, null, 'User dismissed the request', web3RequestData.method);
            console.log('🔌 Dismissal response sent');
            
            // Auto-reject when user closes modal
            if (web3RequestCallbacks?.onReject) {
                console.log('🔌 Auto-rejecting request due to modal close');
                web3RequestCallbacks.onReject(web3RequestData);
            }
        }
        
        console.log('🔌 Closing Web3RequestModal');
        setShowWeb3RequestModal(false);
        setWeb3RequestData(null);
        setWeb3RequestCallbacks(null);
        CommonLoading.hide(); // Hide the loading indicator
    };
    async function handleAccept() {
        try{
            const {id, params} = pairingProposal;
            const {requiredNamespaces: mainNamespaces, optionalNamespaces} = params;
            const currentRequiredNamespaces = _.isEmpty(mainNamespaces)
                ? optionalNamespaces
                : mainNamespaces;
            let chainId = 999;
            console.log(chainId);
            if (!_.isNil(chainId)) {
                const {relays} = params;
                console.log(WalletFactory.wallets);
                const wallet = await WalletFactory.getWallet(
                    CHAIN_ID_TYPE_MAP[chainId],
                );
                console.log(wallet);
                if (_.isNil(wallet)) {
                    CommonAlert.show({
                        title: t('alert.error'),
                        message: 'Network does not support.',
                        type: 'error',
                    });
                    setLoading(false);
                    CommonLoading.hide();
                    return;
                }
                if (pairingProposal && wallet) {
                    CommonLoading.show();
                    const namespaces = {};
                    setActiveChain(CHAIN_ID_TYPE_MAP[chainId]);
                    Object.keys(currentRequiredNamespaces).forEach(key => {
                        const accounts = [];
                        currentRequiredNamespaces[key].chains.map(chain => {
                            [wallet.data.walletAddress].map(acc =>
                                accounts.push(`${chain}:${acc}`),
                            );
                        });
                        namespaces[key] = {
                            accounts,
                            methods: currentRequiredNamespaces[key].methods,
                            events: currentRequiredNamespaces[key].events,
                        };
                    });
                    const approveSession = {
                        id,
                        relayProtocol: relays[0].protocol,
                        namespaces,
                    };
                    await web3wallet.approveSession(approveSession);
                    const newSite = {};
                    newSite[uri] = {
                        chain: CHAIN_ID_TYPE_MAP[chainId],
                        approveSession,
                        pairingProposal,
                    };
                    dispatch(WalletConnectAction.add(newSite));
                    CommonLoading.hide();
                }
                approvalSessionModal?.current.hide();
            }
        }catch (e) {
            console.log(e);
        }

    }

    async function handleDecline() {
        approvalSessionModal?.current.hide();

        if (!pairingProposal) {
            return;
        }
        web3wallet.rejectSession({
            id: pairingProposal.id,
            reason: getSdkError('USER_REJECTED_METHODS'),
        });
    }
    const onShouldStartLoad = event => {
        const url = event.url;
        // Check if the URL scheme is not 'https'
        if (!url.startsWith('https:')) {
            try {
                CommonLoading.show();
                if (loading === false) {
                    setLoading(true);
                    const currentSite = walletConnectSites[getUri(url)];
                    if (_.isNil(currentSite)) {
                        pair(url);
                    } else {
                        setActiveChain(currentSite.chain);
                        setUri(getUri(url));
                        setPairingProposal(currentSite.pairingProposal);
                        const {params} = pairingProposal;
                        const {
                            requiredNamespaces: mainNamespaces,
                            optionalNamespaces,
                        } = params;
                        const currentRequiredNamespaces = _.isEmpty(
                            mainNamespaces,
                        )
                            ? optionalNamespaces
                            : mainNamespaces;
                        setRequiredNamespaces(currentRequiredNamespaces);
                        setRequestSession(currentSite.requestSession);
                    }
                }
            } catch (e) {
                console.log(e);
            }
            return false;
        }
        return true;
    };
    async function onApproveRequest() {
        console.log(requestEventData);
        if (requestEventData) {
            CommonLoading.show();
            try {
                const wallet = await WalletFactory.getWallet(activeChain);
                const response = await approveEIP155Request(
                    requestEventData,
                    wallet.signer,
                );
                await web3wallet.respondSessionRequest({
                    topic: requestEventData.topic,
                    response,
                });
                approvalRequestModal?.current.hide();
            } catch (e) {
                console.log(e);
            }

            CommonLoading.hide();
        }
    }

    async function onRejectRequest() {
        if (requestEventData) {
            CommonLoading.show();
            try {
                const wallet = await WalletFactory.getWallet(activeChain);
                const response = rejectEIP155Request(
                    requestEventData,
                    wallet.signer,
                );
                await web3wallet.respondSessionRequest({
                    topic: requestEventData.topic,
                    response,
                });
                approvalRequestModal?.current.hide();
            } catch (e) {
                console.log(e);
            }

            CommonLoading.hide();
        }
    }

    // Smart Contract Call Modal Handlers
    const handleSmartContractApprove = async (transactionData) => {
        if (!smartContractTransaction) return;
        
        CommonLoading.show();
        try {
            const wallet = await WalletFactory.getWallet(activeChain);
            const response = await approveEIP155Request(
                smartContractTransaction.requestEvent,
                wallet.signer,
            );
            await web3wallet.respondSessionRequest({
                topic: smartContractTransaction.requestEvent.topic,
                response,
            });
            
            setShowSmartContractModal(false);
            setSmartContractTransaction(null);
            
            CommonAlert.show({
                title: t('alert.success'),
                message: 'Transaction approved and sent!',
                type: 'success',
            });
        } catch (error) {
            console.error('Error approving smart contract transaction:', error);
            CommonAlert.show({
                title: t('alert.error'),
                message: `Failed to approve transaction: ${error.message}`,
                type: 'error',
            });
        } finally {
            CommonLoading.hide();
        }
    };

    const handleSmartContractReject = async () => {
        if (!smartContractTransaction) return;
        
        CommonLoading.show();
        try {
            const wallet = await WalletFactory.getWallet(activeChain);
            const response = rejectEIP155Request(
                smartContractTransaction.requestEvent,
                wallet.signer,
            );
            await web3wallet.respondSessionRequest({
                topic: smartContractTransaction.requestEvent.topic,
                response,
            });
            
            setShowSmartContractModal(false);
            setSmartContractTransaction(null);
            
            CommonAlert.show({
                title: t('alert.info'),
                message: 'Transaction rejected',
                type: 'info',
            });
        } catch (error) {
            console.error('Error rejecting smart contract transaction:', error);
            CommonAlert.show({
                title: t('alert.error'),
                message: `Failed to reject transaction: ${error.message}`,
                type: 'error',
            });
        } finally {
            CommonLoading.hide();
        }
    };
    const getUri = url => {
        const match = url.match(/wc:([^@]+)@2/);
        if (match && match[1]) {
            return match[1];
        }
        return '';
    };

    // Network helper functions
    const getNetworkColor = (chain) => {
        const colors = {
            'ETH': '#627EEA',
            'BSC': '#F3BA2F', 
            'POLYGON': '#8247E5',
            'ARB': '#28A0F0',
            'BTTC': '#53CBC9',
            'TRON': '#FF060A'
        };
        return colors[chain] || '#666666';
    };

    const getNetworkIndicatorColor = (chain) => {
        const colors = {
            'ETH': '#FFFFFF',
            'BSC': '#000000',
            'POLYGON': '#FFFFFF', 
            'ARB': '#FFFFFF',
            'BTTC': '#FFFFFF',
            'TRON': '#FFFFFF'
        };
        return colors[chain] || '#FFFFFF';
    };

    const getNetworkDisplayName = (chain) => {
        const names = {
            'ETH': 'Ethereum',
            'BSC': 'BSC',
            'POLYGON': 'Polygon',
            'ARB': 'Arbitrum',
            'BTTC': 'BTTC',
            'TRON': 'TRON'
        };
        return names[chain] || chain;
    };

    const availableNetworks = ['ETH', 'BSC', 'POLYGON', 'ARB', 'BTTC'];

    const handleNetworkSwitch = async newChain => {
        try {
            console.log('🔌 Switching network from', activeChain, 'to', newChain);

            metaMaskWeb3Provider.setCurrentChain(newChain);
            await metaMaskWeb3Provider.ensureWallet(newChain);
            setActiveChain(newChain);

            webRef.current?.postMessage(
                JSON.stringify({
                    type: 'chain_changed',
                    chainId: metaMaskWeb3Provider.getChainIdFromName(newChain),
                    chainName: newChain,
                    timestamp: Date.now(),
                }),
            );

            console.log('🔌 Network switched successfully to:', newChain);
            setShowNetworkModal(false);

            CommonAlert.show({
                title: 'Network Switched',
                message: `Switched to ${getNetworkDisplayName(newChain)} network`,
                type: 'success',
            });
        } catch (error) {
            console.error('🔌 Error switching network:', error);
            CommonAlert.show({
                title: 'Error',
                message: `Failed to switch network: ${error.message}`,
                type: 'error',
            });
        }
    };

    return (
        <SafeAreaView
            style={[styles.container, {backgroundColor: theme.background4}]}>
            <View style={[styles.header]}>
                <View style={styles.leftHeader}>
                    <CommonBackButton
                        onPress={async () => {
                            navigation.goBack();
                        }}
                        color={theme.text}
                    />
                </View>
                <View style={styles.contentHeader}>
                    <CommonText style={styles.headerTitle}>
                        {item.name}
                    </CommonText>
                </View>
                <View style={styles.rightHeader}>
                    {/* Network Selection Button */}
                    <TouchableOpacity
                        style={[styles.networkButton, { backgroundColor: getNetworkColor(activeChain) }]}
                        onPress={() => setShowNetworkModal(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.networkButtonContent}>
                            <View style={[styles.networkIndicator, { backgroundColor: getNetworkIndicatorColor(activeChain) }]} />
                            <CommonText style={styles.networkButtonText}>
                                {getNetworkDisplayName(activeChain)}
                            </CommonText>
                            <Icon 
                                type={Icons.MaterialIcons} 
                                name="keyboard-arrow-down" 
                                size={16} 
                                color="white" 
                            />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.content}>
                <WebView
                    ref={webRef}
                    originWhitelist={['*']}
                    source={{uri: item.url}}
                    onError={onBrowserError}
                    onMessage={onBrowserMessage}
                    onShouldStartLoadWithRequest={onShouldStartLoad}
                    setSupportMultipleWindows={false}
                    renderLoading={() => (
                        <ActivityIndicator size="large" color="#0000ff" />
                    )}
                    injectedJavaScript={`
                        ${metaMaskWeb3Provider.generateWeb3ProviderScript()}
                        ${Platform.OS === 'android' ? injectedJavaScriptAndroid : injectedJavaScriptIos}
                    `}
                    injectedJavaScriptBeforeContentLoaded={`
                        ${metaMaskWeb3Provider.generateWeb3ProviderScript()}
                    `}
                />
            </View>
            <ActionSheet
                ref={approvalSessionModal}
                headerAlwaysVisible
                isModal={Platform.OS === 'android'}
                useBottomSafeAreaPadding={true}
                containerStyle={[
                    styles.sessionRequestContainer,
                    {backgroundColor: theme.background4},
                ]}>
                <SafeAreaView>
                    <View style={styles.titleContainer}>
                        <CommonText
                            style={{
                                fontWeight: 'bold',
                                fontSize: 17,
                                color: theme.text,
                            }}>
                            {pairingProposal?.params?.proposer?.metadata?.name}
                        </CommonText>
                        <CommonText style={{ color: theme.text }}>would like to connect</CommonText>
                        <CommonText style={{ color: theme.text2 }}>
                            {pairingProposal?.params?.proposer?.metadata.url}
                        </CommonText>
                    </View>
                    <View style={[styles.contentContainer]}>
                        <CommonText style={{ color: theme.text, fontWeight: 'bold' }}>REQUESTED PERMISSIONS:</CommonText>
                        {requiredNamespaces?.eip155?.chains?.map(
                            (chain, index) => {
                                return (
                                    <CommonText key={chain} style={{ color: theme.text2 }}>
                                        {chain.toUpperCase()}
                                    </CommonText>
                                );
                            },
                        )}
                        {requiredNamespaces?.eip155?.methods?.length &&
                            requiredNamespaces?.eip155?.methods?.map(
                                (method, index) => (
                                    <CommonText key={method} style={{ color: theme.text2 }}>
                                        {method}
                                    </CommonText>
                                ),
                            )}

                        {requiredNamespaces?.eip155?.events?.map(
                            (method, index) => (
                                <CommonText key={method} style={{ color: theme.text2 }}>{method}</CommonText>
                            ),
                        )}
                    </View>
                    <View style={[styles.buttonContainer]}>
                        <View style={styles.haftButton}>
                            <CommonButton
                                text={'Approve'}
                                onPress={handleAccept}
                                style={[
                                    styles.button,
                                    {
                                        backgroundColor: theme.longColor,
                                    },
                                ]}
                            />
                        </View>
                        <View style={styles.haftButton}>
                            <CommonButton
                                text={'Reject'}
                                style={[
                                    styles.button,
                                    {
                                        backgroundColor: theme.text3,
                                    },
                                ]}
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
                useBottomSafeAreaPadding={true}
                containerStyle={[
                    styles.sessionRequestContainer,
                    {backgroundColor: theme.background},
                ]}>
                <View style={styles.titleContainer}>
                    <CommonText
                        style={{
                            fontWeight: 'bold',
                            fontSize: 17,
                            color: theme.text,
                        }}>
                        {pairingProposal?.params?.proposer?.metadata?.name}
                    </CommonText>
                    <CommonText style={{ color: theme.text }}>would like to connect</CommonText>
                    <CommonText style={{ color: theme.text2 }}>
                        {pairingProposal?.params?.proposer?.metadata.url}
                    </CommonText>
                </View>
                <View style={[styles.contentContainer]}>
                    {requestEventData && (
                        <CommonText style={{ color: theme.text }}>
                            wants to{' '}
                            {requestEventData?.params?.request?.method ===
                            'personal_sign'
                                ? 'sign a message as below: '
                                : 'send a transaction as below'}
                        </CommonText>
                    )}
                    {requestEventData && (
                        <CommonText style={{ color: theme.text2 }}>
                            {JSON.stringify(
                                getSignParamsMessage(
                                    requestEventData?.params?.request?.params,
                                ),
                            )}
                        </CommonText>
                    )}
                </View>
                <View style={[styles.buttonContainer]}>
                    <View style={styles.haftButton}>
                        <CommonButton
                            text={'Approve'}
                            onPress={onApproveRequest}
                        />
                    </View>
                    <View style={styles.haftButton}>
                        <CommonButton
                            text={'Reject'}
                            style={[
                                styles.button,
                                {
                                    backgroundColor: theme.text3,
                                },
                            ]}
                            onPress={onRejectRequest}
                        />
                    </View>
                </View>
            </ActionSheet>
            
            {/* Smart Contract Call Modal */}
            <SmartContractCallModal
                visible={showSmartContractModal}
                onClose={() => {
                    setShowSmartContractModal(false);
                    setSmartContractTransaction(null);
                }}
                onApprove={handleSmartContractApprove}
                onReject={handleSmartContractReject}
                transactionData={smartContractTransaction}
                dappInfo={{
                    name: item.name,
                    url: item.url,
                    icon: null
                }}
            />
            
            {/* Web3 Request Modal */}
            <Web3RequestModal
                visible={showWeb3RequestModal}
                onClose={handleWeb3RequestClose}
                onApprove={handleWeb3RequestApprove}
                onReject={handleWeb3RequestReject}
                requestData={web3RequestData}
                dappInfo={{
                    name: item.name,
                    url: item.url,
                    icon: null
                }}
            />
            
            {/* Network Selection Modal */}
            <ActionSheet
                ref={null}
                isModal={Platform.OS === 'android'}
                useBottomSafeAreaPadding={true}
                visible={showNetworkModal}
                onClose={() => setShowNetworkModal(false)}
                containerStyle={[
                    styles.networkModalContainer,
                    { backgroundColor: theme.background }
                ]}
            >
                <SafeAreaView>
                    <View style={styles.networkModalHeader}>
                        <CommonText style={[styles.networkModalTitle, { color: theme.text }]}>
                            Select Network
                        </CommonText>
                        <TouchableOpacity
                            onPress={() => setShowNetworkModal(false)}
                            style={styles.networkModalCloseButton}
                        >
                            <Icon 
                                type={Icons.MaterialIcons} 
                                name="close" 
                                size={24} 
                                color={theme.text2} 
                            />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.networkList}>
                        {availableNetworks.map((network) => (
                            <TouchableOpacity
                                key={network}
                                style={[
                                    styles.networkItem,
                                    { 
                                        backgroundColor: activeChain === network ? getNetworkColor(network) + '20' : theme.cardBackground,
                                        borderColor: activeChain === network ? getNetworkColor(network) : theme.border
                                    }
                                ]}
                                onPress={() => handleNetworkSwitch(network)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.networkItemContent}>
                                    <View style={[
                                        styles.networkItemIndicator, 
                                        { backgroundColor: getNetworkColor(network) }
                                    ]}>
                                        <View style={[
                                            styles.networkItemDot, 
                                            { backgroundColor: getNetworkIndicatorColor(network) }
                                        ]} />
                                    </View>
                                    <View style={styles.networkItemText}>
                                        <CommonText style={[
                                            styles.networkItemName, 
                                            { color: theme.text }
                                        ]}>
                                            {getNetworkDisplayName(network)}
                                        </CommonText>
                                        <CommonText style={[
                                            styles.networkItemChain, 
                                            { color: theme.text2 }
                                        ]}>
                                            {network} Network
                                        </CommonText>
                                    </View>
                                    {activeChain === network && (
                                        <Icon 
                                            type={Icons.MaterialIcons} 
                                            name="check" 
                                            size={20} 
                                            color={getNetworkColor(network)} 
                                        />
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
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
    rightHeader: {
        width: 100,
        height: '100%',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    // Network Selection Styles
    networkButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 80,
    },
    networkButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    networkIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    networkButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginRight: 2,
    },
    // Network Modal Styles
    networkModalContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    networkModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    networkModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    networkModalCloseButton: {
        padding: 5,
    },
    networkList: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    networkItem: {
        borderRadius: 12,
        marginVertical: 6,
        borderWidth: 1,
        overflow: 'hidden',
    },
    networkItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    networkItemIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    networkItemDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    networkItemText: {
        flex: 1,
    },
    networkItemName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    networkItemChain: {
        fontSize: 12,
        opacity: 0.7,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    item: {
        width: '100%',
        borderBottomWidth: 0.5,
    },
    row: {
        minHeight: 90,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftItemContainer: {
        height: '100%',
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightItemContainer: {
        height: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    browserContainer: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 0 : 48,
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
    browserHeader: {
        height: 30,
        width: '100%',
        flexDirection: 'row',
        paddingHorizontal: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    gapBackground: {
        height: 50,
        width: '100%',
        position: 'absolute',
        top: 0,
    },
    gradient: {
        width: '100%',
        height: '100%',
    },
});
//wc:77911c2c73159a3100a58116ae2362f0261f3ab6c96addd1a80d676a333784d6@2?relay-protocol=irn&symKey=abb2c97d6095a0cd69322a2b6a5353b327304514fd564c473b0adbc49cfbf84a
