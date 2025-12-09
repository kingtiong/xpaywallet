import { walletConnectionProvider } from '@modules/walletconnect/WalletConnectionProvider';
import { WalletFactory } from '@modules/core/factory/WalletFactory';

class MetaMaskWeb3Provider {
    constructor() {
        this.requestCallback = null;
        this.currentChain = walletConnectionProvider.getCurrentChain() || 'ETH';
        this.chainHexMap = {
            ETH: '0x1',
            BSC: '0x38',
            POLYGON: '0x89',
            ARB: '0xa4b1',
            BTTC: '0xc7',
        };
        this.networkVersionMap = {
            ETH: '1',
            BSC: '56',
            POLYGON: '137',
            ARB: '42161',
            BTTC: '199',
        };

        walletConnectionProvider.setCurrentChain(this.currentChain);
    }

    setRequestCallback(callback) {
        this.requestCallback = callback;
    }

    clearRequestCallback() {
        this.requestCallback = null;
    }

    setCurrentChain(chain) {
        this.currentChain = chain;
        walletConnectionProvider.setCurrentChain(chain);
    }

    getChainIdFromName(chain) {
        return this.chainHexMap[chain?.toUpperCase()] || '0x1';
    }

    getChainNameFromId(chainId) {
        const normalized = (chainId || '').toLowerCase();
        const entry = Object.entries(this.chainHexMap).find(
            ([, hex]) => hex.toLowerCase() === normalized,
        );
        return entry ? entry[0] : null;
    }

    getNetworkVersion(chain) {
        return this.networkVersionMap[chain?.toUpperCase()] || '1';
    }

    async ensureWallet(chain = this.currentChain) {
        let connection = walletConnectionProvider.getConnectedWallet(chain);
        if (!connection || !connection.isConnected) {
            connection = await walletConnectionProvider.connectWallet(chain, {});
        }
        if (!connection?.wallet?.signer) {
            const wallet = await WalletFactory.getWallet(chain);
            if (!wallet) {
                throw new Error(`Wallet for ${chain} not initialized`);
            }
            connection = {
                chain,
                address: wallet.data?.walletAddress,
                wallet,
                isConnected: true,
                connectedAt: Date.now(),
            };
            walletConnectionProvider.connectedWallets.set(chain, connection);
        }
        return connection;
    }

    async getAccounts() {
        const connection = await this.ensureWallet();
        const address =
            connection.address || connection.wallet?.data?.walletAddress;
        if (!address) {
            throw new Error('No wallet address available');
        }
        return [address];
    }

    async handleWeb3Request(requestData) {
        const { method, params = [] } = requestData;

        switch (method) {
            case 'eth_chainId':
                return this.getChainIdFromName(this.currentChain);
            case 'net_version':
                return this.getNetworkVersion(this.currentChain);
            case 'eth_accounts':
                return this.getAccounts();
            case 'eth_requestAccounts':
                return this.requestUserApproval(requestData, async () => {
                    return this.getAccounts();
                });
            case 'wallet_switchEthereumChain':
                return this.requestUserApproval(requestData, async () => {
                    await this.switchChain(params);
                    return null;
                });
            case 'wallet_addEthereumChain':
                return this.requestUserApproval(requestData, async () => {
                    await this.addChain(params[0] || params);
                    return null;
                });
            case 'wallet_showAlert':
            case 'wallet_showConfirm':
                return this.requestUserApproval(requestData, async () => true);
            case 'personal_sign':
            case 'eth_sign':
            case 'eth_signTypedData':
            case 'eth_signTypedData_v3':
            case 'eth_signTypedData_v4':
            case 'eth_sendTransaction':
                return this.requestUserApproval(requestData, async () => {
                    await this.ensureWallet();
                    return walletConnectionProvider.handleRequest(method, params);
                });
            default:
                await this.ensureWallet();
                return walletConnectionProvider.handleRequest(method, params);
        }
    }

    requestUserApproval(requestData, handler) {
        if (typeof this.requestCallback !== 'function') {
            throw new Error('USER_INTERACTION_REQUIRED');
        }

        const safeHandler = handler || (async () => null);

        this.requestCallback({
            requestData,
            onApprove: async () => {
                return safeHandler();
            },
            onReject: async () => {
                return null;
            },
        });

        throw new Error('USER_INTERACTION_REQUIRED');
    }

    sendResponse(webRef, requestId, result, error, method) {
        if (!webRef?.current) {
            return;
        }

        const payload = {
            type: 'eth_response',
            id: requestId,
            method,
            result: error ? null : result,
            error,
        };

        const message = JSON.stringify(payload);
        webRef.current.postMessage(message);

        const escaped = message.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        webRef.current.injectJavaScript(
            `window.postMessage('${escaped}', '*'); true;`,
        );
    }

    async switchChain(chainParams) {
        const params = Array.isArray(chainParams)
            ? chainParams[0]
            : chainParams;
        const chainId = params?.chainId || params;
        const chainName = this.getChainNameFromId(chainId);
        if (!chainName) {
            throw new Error('Unsupported chain');
        }
        this.setCurrentChain(chainName);
        await this.ensureWallet(chainName);
        return null;
    }

    generateWeb3ProviderScript() {
        return walletConnectionProvider.generateInjectedJavaScript();
    }
}

export const metaMaskWeb3Provider = new MetaMaskWeb3Provider();
