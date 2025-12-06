import { ethers } from 'ethers';
import { WalletFactory } from '@modules/core/factory/WalletFactory';
import { CHAIN_ID_TYPE_MAP } from '@modules/core/constant/constant';

export class WalletConnectionProvider {
    constructor() {
        this.connectedWallets = new Map();
        this.currentChain = 'ETH';
        this.requestId = 0;
    }

    // Set the current active chain
    setCurrentChain(chain) {
        this.currentChain = chain;
    }

    // Get the current active chain
    getCurrentChain() {
        return this.currentChain;
    }

    // Connect a wallet for a specific chain
    async connectWallet(chain, walletData) {
        try {
            const wallet = await WalletFactory.getWallet(chain);
            if (!wallet) {
                throw new Error(`No wallet found for chain: ${chain}`);
            }

            const connectionData = {
                chain,
                address: wallet.data.walletAddress,
                wallet,
                isConnected: true,
                connectedAt: Date.now()
            };

            this.connectedWallets.set(chain, connectionData);
            return connectionData;
        } catch (error) {
            console.error('Error connecting wallet:', error);
            throw error;
        }
    }

    // Disconnect wallet for a specific chain
    disconnectWallet(chain) {
        this.connectedWallets.delete(chain);
    }

    // Get connected wallet for a chain
    getConnectedWallet(chain) {
        return this.connectedWallets.get(chain);
    }

    // Check if wallet is connected for a chain
    isWalletConnected(chain) {
        const wallet = this.connectedWallets.get(chain);
        return wallet && wallet.isConnected;
    }

    // Get all connected chains
    getConnectedChains() {
        return Array.from(this.connectedWallets.keys());
    }

    // Generate unique request ID
    generateRequestId() {
        return ++this.requestId;
    }

    // Handle Ethereum provider requests
    async handleRequest(method, params = []) {
        const chain = this.getCurrentChain();
        const wallet = this.getConnectedWallet(chain);

        if (!wallet) {
            throw new Error('No wallet connected');
        }

        try {
            switch (method) {
                case 'eth_chainId':
                    return this.getChainId(chain);

                case 'net_version':
                    return this.getNetworkVersion(chain);

                case 'eth_accounts':
                case 'eth_requestAccounts':
                    return [wallet.address];

                case 'eth_getBalance':
                    const [address, blockTag] = params;
                    return await this.getBalance(address, blockTag, chain);

                case 'eth_getTransactionCount':
                    const [addr, block] = params;
                    return await this.getTransactionCount(addr, block, chain);

                case 'eth_gasPrice':
                    return await this.getGasPrice(chain);

                case 'eth_estimateGas':
                    return await this.estimateGas(params[0], chain);

                case 'eth_getBlockByNumber':
                    return await this.getBlockByNumber(params[0], params[1], chain);

                case 'eth_getTransactionByHash':
                    return await this.getTransactionByHash(params[0], chain);

                case 'eth_getTransactionReceipt':
                    return await this.getTransactionReceipt(params[0], chain);

                case 'personal_sign':
                    const [message, from] = params;
                    return await this.personalSign(message, from, chain);

                case 'eth_sign':
                    const [fromAddr, msg] = params;
                    return await this.ethSign(msg, fromAddr, chain);

                case 'eth_signTransaction':
                    return await this.signTransaction(params[0], chain);

                case 'eth_sendTransaction':
                    return await this.sendTransaction(params[0], chain);

                case 'eth_signTypedData':
                case 'eth_signTypedData_v3':
                case 'eth_signTypedData_v4':
                    return await this.signTypedData(method, params, chain);

                case 'wallet_switchEthereumChain':
                    const [{ chainId }] = params;
                    return await this.switchChain(chainId);

                case 'wallet_addEthereumChain':
                    const [chainParams] = params;
                    return await this.addChain(chainParams);

                default:
                    // Forward to provider for other methods
                    return await this.forwardToProvider(method, params, chain);
            }
        } catch (error) {
            console.error(`Error handling ${method}:`, error);
            throw error;
        }
    }

    // Get chain ID for a given chain
    getChainId(chain) {
        const chainMap = {
            'ETH': '0x1',
            'BSC': '0x38',
            'POLYGON': '0x89'
        };
        return chainMap[chain] || '0x1';
    }

    // Get network version
    getNetworkVersion(chain) {
        const versionMap = {
            'ETH': '1',
            'BSC': '56',
            'POLYGON': '137'
        };
        return versionMap[chain] || '1';
    }

    // Get balance for an address
    async getBalance(address, blockTag, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        const provider = wallet.wallet.provider;
        const balance = await provider.getBalance(address, blockTag);
        return '0x' + balance.toString(16);
    }

    // Get transaction count
    async getTransactionCount(address, blockTag, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        const provider = wallet.wallet.provider;
        const count = await provider.getTransactionCount(address, blockTag);
        return '0x' + count.toString(16);
    }

    // Get gas price
    async getGasPrice(chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        const provider = wallet.wallet.provider;
        const gasPrice = await provider.getGasPrice();
        return '0x' + gasPrice.toString(16);
    }

    // Estimate gas
    async estimateGas(transaction, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        const provider = wallet.wallet.provider;
        const gasEstimate = await provider.estimateGas(transaction);
        return '0x' + gasEstimate.toString(16);
    }

    // Get block by number
    async getBlockByNumber(blockNumber, includeTransactions, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        const provider = wallet.wallet.provider;
        const block = await provider.getBlock(blockNumber, includeTransactions);
        return block;
    }

    // Get transaction by hash
    async getTransactionByHash(txHash, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        const provider = wallet.wallet.provider;
        const tx = await provider.getTransaction(txHash);
        return tx;
    }

    // Get transaction receipt
    async getTransactionReceipt(txHash, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        const provider = wallet.wallet.provider;
        const receipt = await provider.getTransactionReceipt(txHash);
        return receipt;
    }

    // Personal sign
    async personalSign(message, from, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        if (wallet.address.toLowerCase() !== from.toLowerCase()) {
            throw new Error('Address mismatch');
        }

        const messageBytes = ethers.utils.isHexString(message) 
            ? ethers.utils.arrayify(message)
            : ethers.utils.toUtf8Bytes(message);

        const signature = await wallet.wallet.signer.signMessage(messageBytes);
        return signature;
    }

    // Eth sign
    async ethSign(message, from, chain) {
        return await this.personalSign(message, from, chain);
    }

    // Sign transaction
    async signTransaction(transaction, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        const signedTx = await wallet.wallet.signer.signTransaction(transaction);
        return signedTx;
    }

    // Send transaction
    async sendTransaction(transaction, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        const txResponse = await wallet.wallet.signer.sendTransaction(transaction);
        return txResponse.hash;
    }

    // Sign typed data (EIP-712)
    async signTypedData(method, params, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        if (!wallet.wallet?.signer?._signTypedData) {
            throw new Error('Typed data signing not supported');
        }

        let address;
        let rawData;

        switch (method) {
            case 'eth_signTypedData':
                // Legacy order: data first, address second
                [rawData, address] = params;
                break;
            case 'eth_signTypedData_v3':
            case 'eth_signTypedData_v4':
            default:
                // Modern order: address first, data second
                [address, rawData] = params;
                break;
        }

        if (!address || wallet.address.toLowerCase() !== address.toLowerCase()) {
            throw new Error('Address mismatch');
        }

        if (!rawData) {
            throw new Error('Typed data payload missing');
        }

        let typedData = rawData;
        if (typeof typedData === 'string') {
            try {
                typedData = JSON.parse(typedData);
            } catch (error) {
                throw new Error('Invalid typed data JSON');
            }
        }

        const { domain = {}, types = {}, message = {} } = typedData;
        const sanitizedTypes = { ...types };
        delete sanitizedTypes.EIP712Domain; // ethers handles domain separately

        return await wallet.wallet.signer._signTypedData(domain, sanitizedTypes, message);
    }

    // Switch chain
    async switchChain(chainId) {
        const chainMap = {
            '0x1': 'ETH',
            '0x38': 'BSC',
            '0x89': 'POLYGON'
        };
        
        const chain = chainMap[chainId];
        if (!chain) {
            throw new Error('Unsupported chain');
        }

        this.setCurrentChain(chain);
        return null;
    }

    // Add chain
    async addChain(chainParams) {
        // This would typically add a new chain configuration
        // For now, we'll just return success
        return null;
    }

    // Forward request to provider
    async forwardToProvider(method, params, chain) {
        const wallet = this.getConnectedWallet(chain);
        if (!wallet) throw new Error('No wallet connected');

        const provider = wallet.wallet.provider;
        return await provider.send(method, params);
    }

    // Generate the injected JavaScript for WebView
    generateInjectedJavaScript() {
        const chainId = this.getChainId(this.currentChain);
        const networkVersion = this.getNetworkVersion(this.currentChain);
        const connectedWallets = Array.from(this.connectedWallets.values());

        return `
            (function() {
                // Add viewport meta for better mobile rendering
                const meta = document.createElement('meta');
                meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
                meta.setAttribute('name', 'viewport');
                document.getElementsByTagName('head')[0].appendChild(meta);

                // Store connected wallets data
                const connectedWallets = ${JSON.stringify(connectedWallets)};
                const currentChain = '${this.currentChain}';
                const currentChainId = '${chainId}';
                const currentNetworkVersion = '${networkVersion}';

                // Find current wallet
                const currentWallet = connectedWallets.find(w => w.chain === currentChain);

                // Create Ethereum provider (EIP-1193 compatible)
                window.ethereum = {
                    chainId: currentChainId,
                    networkVersion: currentNetworkVersion,
                    selectedAddress: currentWallet ? currentWallet.address : null,
                    isMetaMask: true,
                    isConnected: () => currentWallet ? currentWallet.isConnected : false,

                    // Event listeners
                    _listeners: {},
                    on: function(event, callback) {
                        if (!this._listeners[event]) {
                            this._listeners[event] = [];
                        }
                        this._listeners[event].push(callback);
                    },
                    removeListener: function(event, callback) {
                        if (this._listeners[event]) {
                            const index = this._listeners[event].indexOf(callback);
                            if (index > -1) {
                                this._listeners[event].splice(index, 1);
                            }
                        }
                    },
                    emit: function(event, ...args) {
                        if (this._listeners[event]) {
                            this._listeners[event].forEach(callback => {
                                try {
                                    callback(...args);
                                } catch (error) {
                                    console.error('Error in event listener:', error);
                                }
                            });
                        }
                    },

                    // Enable/Connect method
                    enable: function() {
                        return new Promise((resolve, reject) => {
                            if (currentWallet && currentWallet.isConnected) {
                                resolve([currentWallet.address]);
                            } else {
                                reject(new Error('No wallet connected'));
                            }
                        });
                    },

                    // Request method
                    request: function(args) {
                        return new Promise((resolve, reject) => {
                            const id = Math.random().toString(36).substring(7);
                            
                            // Listener for response from native
                            const handler = (event) => {
                                if (event.data && event.data.id === id) {
                                    if (event.data.error) {
                                        reject(new Error(event.data.error));
                                    } else {
                                        resolve(event.data.result);
                                    }
                                    window.removeEventListener('message', handler);
                                }
                            };
                            
                            window.addEventListener('message', handler);
                            
                            // Send request to native
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'eth_request',
                                method: args.method,
                                params: args.params || [],
                                id: id
                            }));
                        });
                    },

                    // Legacy methods for compatibility
                    send: function(method, params) {
                        return this.request({ method, params });
                    },

                    sendAsync: function(payload, callback) {
                        this.request(payload).then(result => {
                            callback(null, { id: payload.id, result });
                        }).catch(error => {
                            callback(error, { id: payload.id, error: error.message });
                        });
                    }
                };

                // Provide compatibility bridge for DApps expecting `window.dappwallet`
                (function initDappWalletBridge() {
                    const ensureFunction = (fn) => typeof fn === 'function' ? fn : () => {};
                    const createBridge = () => ({
                        version: '1.0.0',
                        name: 'NewXPay DApp Wallet',
                        isDappWallet: true,
                        isMetaMask: true,
                        get provider() {
                            return window.ethereum;
                        },
                        get chainId() {
                            return window.ethereum?.chainId || currentChainId;
                        },
                        get selectedAddress() {
                            return window.ethereum?.selectedAddress || null;
                        },
                        isConnected: () => {
                            if (window.ethereum?.isConnected) {
                                return window.ethereum.isConnected();
                            }
                            return !!(window.ethereum && window.ethereum.selectedAddress);
                        },
                        connect: () => {
                            if (window.ethereum?.request) {
                                return window.ethereum.request({ method: 'eth_requestAccounts' });
                            }
                            return Promise.reject(new Error('Provider not ready'));
                        },
                        request: (args) => {
                            if (window.ethereum?.request) {
                                return window.ethereum.request(args);
                            }
                            return Promise.reject(new Error('Provider not ready'));
                        },
                        getProvider: () => window.ethereum,
                        on: (...params) => ensureFunction(window.ethereum?.on)(...params),
                        removeListener: (...params) => ensureFunction(window.ethereum?.removeListener)(...params)
                    });

                    const bridge = createBridge();
                    window.dappwallet = Object.assign(window.dappwallet || {}, bridge);
                    window.dappWallet = window.dappWallet || window.dappwallet;

                    try {
                        window.dispatchEvent(new Event('dappwallet#initialized'));
                    } catch (e) {
                        // Ignore environments that don't support custom events yet
                    }
                })();

                // Dispatch events to notify DApp that ethereum is ready
                window.dispatchEvent(new Event('ethereum#initialized'));
                
                // Emit accountsChanged if wallet is connected
                if (currentWallet && currentWallet.isConnected) {
                    setTimeout(() => {
                        window.ethereum.emit('accountsChanged', [currentWallet.address]);
                        window.ethereum.emit('connect', { chainId: currentChainId });
                    }, 100);
                }
            })();
            true;
        `;
    }
}

// Singleton instance
export const walletConnectionProvider = new WalletConnectionProvider();
