import 'react-native-get-random-values';
import '@ethersproject/shims';
import {BigNumber, ethers, utils} from 'ethers';
import {ProviderFactory} from '@modules/core/factory/ProviderFactory';
import {BitcoinWallet} from '@modules/core/provider/bitcoin/BitcoinWallet';
import {EthWallet} from '@modules/core/provider/eth/EthWallet';
import {configProperties} from '@modules/core/config/config.properties';
import axios from 'axios';
import BitcoinUtil from '@modules/core/provider/bitcoin/BitcoinUtil';
import {
    ASSET_TYPE_COIN,
    ASSET_TYPE_TOKEN,
} from '@modules/core/constant/constant';
import _ from 'lodash';
import {TronWallet} from '@modules/core/provider/tron/TronWallet';
import {SolanaWallet} from '@modules/core/provider/solana/SolanaWallet';
import TronWeb from 'tronweb';
import {Logs} from '@modules/core/log/logs';
import {StorageService} from '@modules/core/storage/StorageService';
import {entropyToMnemonic, formatEther, formatUnits} from 'ethers/lib/utils';
import {encode} from 'bs58';
import {
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    ComputeBudgetProgram,
} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID, getAssociatedTokenAddress} from '@solana/spl-token';
import * as solanaWeb3 from '@solana/web3.js';
import {SolanaProvider} from '@modules/core/provider/solana/SolanaProvider';
import moment from 'moment';
export class WalletFactory {
    static wallets = {};

    static async fromMnemonic(coins, mnemonic) {
        await WalletFactory.destroy();
        const all = [];
        try {
            for (let i = 0; i < coins.length; i++) {
                const coin = coins[i];
                const provider = await ProviderFactory.getProvider(coin.chain);
                const startTime = performance.now();
                if (coin.chain === 'BTC') {
                    let btcWallet = this.wallets.BTC;
                    if (!btcWallet) {
                        btcWallet = new BitcoinWallet(provider);
                        const {success, data} = await btcWallet.fromMnemonic(
                            coin,
                            mnemonic || coin.mnemonic,
                        );
                        if (success) {
                            this.wallets[coin.chain] = btcWallet;
                            all.push({
                                ...data,
                                mnemonic,
                                privateKey: data.privateKey,
                            });
                        }
                    } else {
                        const baseBtcWallet = {
                            ...coin,
                            mnemonic,
                            walletAddress: btcWallet.data?.walletAddress,
                            privateKey: btcWallet.data?.privateKey,
                        };
                        if (coin.type === ASSET_TYPE_COIN) {
                            this.wallets[coin.chain] = btcWallet;
                        }
                        all.push(baseBtcWallet);
                    }
                } else
                if (
                    coin.chain === 'ETH' ||
                    coin.chain === 'BSC' ||
                    coin.chain === 'POLYGON'
                ) {
                    let ethWallet =
                        this.wallets.ETH ||
                        this.wallets.BSC ||
                        this.wallets.POLYGON;

                    if (!ethWallet) {
                        ethWallet = new EthWallet(provider);
                        const {success, data} = await ethWallet.fromMnemonic(
                            coin,
                            mnemonic || coin.mnemonic,
                        );
                        if (success) {
                            ethWallet.setData(data);
                            this.wallets[coin.chain] = ethWallet;
                            all.push({
                                ...data,
                                mnemonic,
                                privateKey: data.privateKey,
                            });
                        }
                    } else {
                        const baseEthWallet = {
                            ...coin,
                            mnemonic,
                            walletAddress: ethWallet.data.walletAddress,
                            privateKey: ethWallet.data.privateKey,
                        };
                        const eth = new EthWallet(provider);
                        eth.data = baseEthWallet;
                        eth.setSigner(ethWallet.signer);
                        if (coin.type === ASSET_TYPE_COIN) {
                            this.wallets[coin.chain] = eth;
                        }
                        all.push(baseEthWallet);
                    }
                } else if (coin.chain === 'TRON') {
                    let tronWallet = this.wallets.TRON;
                    if (!tronWallet) {
                        tronWallet = new TronWallet(provider);
                        const {success, data} = await tronWallet.fromMnemonic(
                            coin,
                            mnemonic || coin.mnemonic,
                        );
                        if (success) {
                            tronWallet.setData(data);
                            this.wallets[coin.chain] = tronWallet;
                            all.push({
                                ...data,
                                mnemonic,
                                privateKey: data.privateKey,
                            });
                        }
                    } else {
                        const baseTronWallet = {
                            ...coin,
                            mnemonic,
                            walletAddress: tronWallet.data.walletAddress,
                            privateKey: tronWallet.data.privateKey,
                        };
                        if (coin.type === ASSET_TYPE_COIN) {
                            this.wallets[coin.chain] = new TronWallet(provider);
                        }
                        all.push(baseTronWallet);
                    }
                } else if (coin.chain === 'SOLANA') {
                    try {
                        let solanaWallet = this.wallets.SOLANA;
                        if (!solanaWallet) {
                            solanaWallet = new SolanaWallet(provider);
                            const {success, data} =
                                await solanaWallet.fromMnemonic(
                                    coin,
                                    mnemonic || coin.mnemonic,
                                );
                            if (success) {
                                this.wallets[coin.chain] = solanaWallet;
                                all.push({
                                    ...data,
                                    mnemonic,
                                    privateKey: data.privateKey, // Ensure it's Base58 encoded
                                });
                            } else {
                                console.log('coin', coin, 'failed');
                            }
                        } else {
                            try {
                                console.log('trying: ', coin);
                                const baseSolanaWallet = {
                                    ...coin,
                                    mnemonic,
                                    walletAddress:
                                        solanaWallet.keypair.publicKey.toString(),
                                    privateKey: encode(
                                        solanaWallet.keypair.secretKey,
                                    ), // Base58 encode
                                };

                                if (coin.type === ASSET_TYPE_COIN) {
                                    this.wallets[coin.chain] = new SolanaWallet(
                                        provider,
                                    );
                                }

                                all.push(baseSolanaWallet);
                            } catch (error) {
                                Logs.info(
                                    'WalletFactory: fromMnemonic inside block',
                                    error,
                                );
                                continue;
                                // console.log('Solana Wallet')
                            }
                        }
                    } catch (error) {
                        Logs.info(
                            "There's an error fromMnemonic Solata, ",
                            error,
                        );
                        console.log(
                            "There's an error fromMnemonic Solata, ",
                            error,
                        );
                    }
                }
                const endTime = performance.now();
                const executionTime = endTime - startTime; // Calculate execution time
            }
            const wallets = _.filter(all, {type: ASSET_TYPE_COIN});
            const tokens = _.filter(all, {type: ASSET_TYPE_TOKEN});
            return {
                all,
                coins: wallets,
                tokens,
            };
        } catch (e) {
            Logs.info('WalletFactory: fromMnemonic', e);
        }
        return {
            all,
            wallets: [],
            tokens: [],
        };
    }

    static async fromPrivateKey(coins, privateKey) {
        const all = [];
        try {
            for (let i = 0; i < coins.length; i++) {
                const coin = coins[i];
                const provider = await ProviderFactory.getProvider(coin.chain);
                if (coin.chain === 'BTC') {
                    const btcWallet = new BitcoinWallet(provider);
                    const {success, data} = await btcWallet.fromPrivateKey(
                        coin,
                        privateKey || coin.privateKey,
                    );
                    if (success) {
                        this.wallets[coin.chain] = btcWallet;
                        all.push(data);
                    }
                } else if (
                    coin.chain === 'ETH' ||
                    coin.chain === 'BSC' ||
                    coin.chain === 'POLYGON'
                ) {
                    let ethWallet =
                        this.wallets.ETH ||
                        this.wallets.BSC ||
                        this.wallets.POLYGON;
                    if (!ethWallet) {
                        ethWallet = new EthWallet(provider);
                        const {success, data} = await ethWallet.fromPrivateKey(
                            coin,
                        );
                        if (success) {
                            ethWallet.setData(data);
                            this.wallets[coin.chain] = ethWallet;
                            all.push(data);
                        }
                    } else {
                        const baseEthWallet = {
                            ...coin,
                            walletAddress: coin.walletAddress,
                            privateKey: coin.privateKey,
                        };
                        const eth = new EthWallet(provider);
                        eth.data = baseEthWallet;
                        eth.setSigner(ethWallet.signer);
                        if (coin.type === ASSET_TYPE_COIN) {
                            this.wallets[coin.chain] = eth;
                        }
                        all.push(baseEthWallet);
                    }
                } else if (coin.chain === 'TRON') {
                    let tronWallet = this.wallets.TRON;
                    if (!tronWallet) {
                        tronWallet = new TronWallet(provider);
                        const {success, data} = await tronWallet.fromPrivateKey(
                            coin,
                        );
                        if (success) {
                            tronWallet.setData(data);
                            this.wallets[coin.chain] = tronWallet;
                            all.push({
                                ...data,
                                privateKey: data.privateKey,
                            });
                        }
                    } else {
                        const baseTronWallet = {
                            ...coin,
                            walletAddress: tronWallet.data.walletAddress,
                            privateKey: tronWallet.data.privateKey,
                        };
                        if (coin.type === ASSET_TYPE_COIN) {
                            this.wallets[coin.chain] = new TronWallet(provider);
                        }
                        all.push(baseTronWallet);
                    }
                } else if (coin.chain === 'SOLANA') {
                    let solanaWallet = this.wallets.SOLANA;
                    if (!solanaWallet) {
                        solanaWallet = new SolanaWallet(provider);
                        const result = await solanaWallet.fromPrivateKey(coin, coin.privateKey);
                        if (result && result.success) {
                            solanaWallet.setData(result.data);
                            this.wallets[coin.chain] = solanaWallet;
                            all.push({
                                ...result.data,
                                privateKey: result.data.privateKey,
                            });
                        } else {
                            Logs.info('WalletFactory: fromPrivateKey', 'Failed to create Solana wallet:', result?.data?.error || 'Unknown error');
                        }
                    } else {
                        const baseSolanaWallet = {
                            ...coin,
                            walletAddress: solanaWallet.data.walletAddress,
                            privateKey: solanaWallet.data.privateKey,
                        };
                        if (coin.type === ASSET_TYPE_COIN) {
                            this.wallets[coin.chain] = new SolanaWallet(
                                provider,
                            );
                        }
                        all.push(baseSolanaWallet);
                    }
                }
            }
            const wallets = _.filter(all, {type: ASSET_TYPE_COIN});
            const tokens = _.filter(all, {type: ASSET_TYPE_TOKEN});
            return {
                all,
                coins: wallets,
                tokens,
            };
        } catch (e) {
            Logs.info('WalletFactory: fromPrivateKey', e);
        }
        return {
            all,
            wallets: [],
            tokens: [],
        };
    }

    static getWallet(chain) {
        return this.wallets[chain];
    }

    static async getTransactionFee(chain, transaction) {
        try {
            const provider = await ProviderFactory.getProvider(chain);
            var feeData;
            if (chain === 'SOLANA') {
                var _provider = new SolanaProvider({
                    apiEndpoint:
                        'https://solana-mainnet.core.chainstack.com/2ef19b6485a2171959b47e653266c846',
                    cluster:
                        'https://solana-mainnet.core.chainstack.com/2ef19b6485a2171959b47e653266c846',
                });
                feeData = await _provider.getFeeData(
                    transaction.from,
                    transaction.to,
                );

                return await _provider.estimateGas({
                    ...transaction,
                    gasPrice: 0,
                });
            }
            feeData = await provider.getFeeData();
            let gasPrice = 0;
            if (chain === 'BTC') {
                gasPrice = feeData.data.fast;
            } else if (
                chain === 'ETH' ||
                chain === 'BSC' ||
                chain === 'POLYGON'
            ) {
                gasPrice = feeData.gasPrice;
            }
            if (chain === 'BTC' || chain === 'TRON' || chain === 'RIPPLE') {
                return await provider.estimateGas({
                    ...transaction,
                    gasPrice: gasPrice,
                });
            } else if (
                chain === 'ETH' ||
                chain === 'BSC' ||
                chain === 'POLYGON'
            ) {
                if (transaction.tokenContractAddress) {
                    const wallet = this.getWallet(chain);
                    const fee = await provider.getEstimateTokenGas({
                        signer: wallet.signer,
                        ...transaction,
                        gasPrice: gasPrice,
                    });

                    return {
                        success: true,
                        data: {
                            ...fee,
                        },
                    };
                } else {
                    const estimateGas = await provider.estimateGas({
                        ...transaction,
                        gasPrice: gasPrice,
                    });
                    const fee = estimateGas.mul(feeData.gasPrice);
                    return {
                        success: true,
                        data: {
                            estimateGas: {
                                wei: fee,
                                ether: utils.formatEther(fee),
                            },
                            gas: {
                                gasLimit: estimateGas,
                                gasPrice: feeData.gasPrice,
                            },
                        },
                    };
                }
            }
        } catch (e) {
            Logs.info('WalletFactory: getTransactionFee', e);
            return {
                success: false,
                data: e.reason,
            };
        }
    }

    static async sendTransaction(activeAssets, transaction) {
        try {
            if (activeAssets.chain.toUpperCase() === 'SOLANA') {
                const _provider = new SolanaProvider({
                    apiEndpoint:
                        'https://solana-mainnet.core.chainstack.com/2ef19b6485a2171959b47e653266c846',
                    cluster: 'https://solana-mainnet.core.chainstack.com/2ef19b6485a2171959b47e653266c846',
                });
                const wallet = new SolanaWallet(_provider);
                wallet.fromPrivateKey(null, activeAssets.privateKey);

                let send;
                if (
                    ['mxg', 'xusdt', 'btc', 'eths', 'doge', 'ltc'].includes(
                        activeAssets.id,
                    )
                ) {
                    send = await wallet.sendSplTransaction(wallet, {
                        to: transaction.to,
                        value: transaction.value,
                        mintAddress: transaction.tokenContractAddress,
                        decimals: transaction.decimals,
                    });
                } else {
                    send = await wallet.sendTransaction({
                        to: transaction.to,
                        value: transaction.value,
                        feePayer: transaction.takerFee,
                    });
                }

                if (!send) throw new Error('Failed to send Solana transaction');

                return {success: send.success, data: send.data};
            }

            if (
                ['BSC', 'ETH', 'POLYGON', 'BINANCECOIN'].includes(
                    activeAssets.chain.toUpperCase(),
                )
            ) {
                const rpcUrl =
                    activeAssets.rpc ||
                    (activeAssets.chain.toUpperCase() === 'BSC'
                        ? 'https://bsc-dataseed.binance.org/'
                        : activeAssets.chain.toUpperCase() === 'ETH'
                        ? 'https://mainnet.infura.io/v3/d537fa2b340d468d81ea905f9a0d1478'
                        : 'https://polygon-rpc.com/');

                const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
                const wallet = new ethers.Wallet(
                    activeAssets.privateKey,
                    provider,
                );

                let tx;
                if (activeAssets.type === 'token') {
                    const erc20 = new ethers.Contract(
                        activeAssets.contract,
                        [
                            'function decimals() view returns (uint8)',
                            'function transfer(address to, uint amount) returns (bool)',
                        ],
                        wallet,
                    );
                    const decimals =
                        activeAssets.decimals || transaction.decimals || 18;
                    const amount = ethers.utils.parseUnits(
                        transaction.value.toString(),
                        decimals,
                    );
                    const response = await erc20.transfer(
                        transaction.to,
                        amount,
                    );
                    const receipt = await response.wait();
                    return {success: true, data: receipt.transactionHash};
                } else {
                    const response = await wallet.sendTransaction({
                        to: transaction.to,
                        value: ethers.utils.parseEther(
                            transaction.value.toString(),
                        ),
                    });
                    const receipt = await response.wait();
                    return {success: true, data: receipt.transactionHash};
                }
            }

            throw new Error(`Unsupported chain: ${activeAssets.chain}`);
        } catch (e) {
            console.error('WalletFactory: sendTransaction ERROR:', e);
            return {
                success: false,
                data: e.reason || e.message || 'Unknown error',
            };
        }
    }

    static async sendTransaction2(chain, transaction) {
        try {
            const wallet = await this.getWallet(chain);
            console.log(wallet);
            return await wallet.sendTransaction(transaction);
        } catch (e) {
            Logs.info('WalletFactory: sendTransaction', e);
            return {
                success: false,
                data: e.reason,
            };
        }
    }

    static async getBscTransaction(wallet) {
        try {
            const response = await axios.get(configProperties.bsc.api2, {
                params: {
                    chainId: configProperties.bsc.chainId,
                    module: 'account',
                    action: 'txlist',
                    address: wallet.walletAddress,
                    startblock: 0,
                    endblock: 99999999,
                    page: 1,
                    offset: 10,
                    sort: 'desc',
                    apikey: configProperties.bsc.keyEther,
                },
            });

            if (
                !response.data ||
                !response.data.result ||
                response.data.result.length === 0
            ) {
                Logs.warn('BscScan returned empty result', response.data);
                return {success: true, data: []};
            }

            const transactions = response.data.result.map(tx => {
                const isSender =
                    tx.from.toLowerCase() ===
                    wallet.walletAddress.toLowerCase();
                const value = Number(ethers.utils.formatEther(tx.value));
                const gasFee = ethers.utils.formatEther(
                    BigInt(tx.gasUsed) * BigInt(tx.gasPrice),
                );

                return {
                    txHash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    status: tx.isError === '0' ? '-1' : '0',
                    createdAt: Number(tx.timeStamp),
                    gasFee,
                    value,
                    isSender,
                    explore: `${configProperties.bsc.explore}tx/${tx.hash}`,
                    type: isSender ? 'outgoing' : 'incoming',
                };
            });
            console.log('bsc transactions:', transactions);
            return {
                success: true,
                data: transactions,
            };
        } catch (error) {
            // Logs.error('WalletFactory: getBscTransactions', error);
            // return {
            //     success: false,
            //     error: error.message || 'Unknown error hehenak',
            // };
            if (error.response) {
                Logs.error('BscScan API Error', {
                    status: error.response.status,
                    data: error.response.data,
                });
                return {
                    success: false,
                    error: `BscScan API error (${
                        error.response.status
                    }): ${JSON.stringify(error.response.data)}`,
                };
            } else if (error.request) {
                Logs.error('No response from BscScan', error.request);
                return {
                    success: false,
                    error: 'No response from BscScan API. Check your network or API key.',
                };
            } else {
                Logs.error(
                    'Unexpected error in getBscTransactions',
                    error.message,
                );
                return {
                    success: false,
                    error: `Unexpected error: ${error.message}`,
                };
            }
        }
    }
    static async getEthTransaction(wallet) {
        try {
            const response = await axios.get(configProperties.bsc.api2, {
                params: {
                    chainId: configProperties.eth.chainId,
                    module: 'account',
                    action: 'txlist',
                    address: wallet.walletAddress,
                    startblock: 0,
                    endblock: 99999999,
                    page: 1,
                    offset: 10,
                    sort: 'desc',
                    apikey: configProperties.eth.keyEther,
                },
            });

            if (
                !response.data ||
                !response.data.result ||
                response.data.result.length === 0
            ) {
                Logs.warn('Etherscan returned empty result', response.data);
                return {success: true, data: []};
            }

            const transactions = response.data.result.map(tx => {
                const isSender =
                    tx.from.toLowerCase() ===
                    wallet.walletAddress.toLowerCase();
                const value = Number(ethers.utils.formatEther(tx.value));
                const gasFee = ethers.utils.formatEther(
                    BigInt(tx.gasUsed) * BigInt(tx.gasPrice),
                );

                return {
                    txHash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    status: tx.isError === '0' ? '-1' : '0',
                    createdAt: Number(tx.timeStamp),
                    gasFee,
                    value,
                    isSender,
                    explore: `${configProperties.eth.explore}tx/${tx.hash}`,
                    type: isSender ? 'outgoing' : 'incoming',
                };
            });
            console.log('eth transactions:', transactions);
            return {
                success: true,
                data: transactions,
            };
        } catch (error) {
            if (error.response) {
                Logs.error('Etherscan API Error', {
                    status: error.response.status,
                    data: error.response.data,
                });
                return {
                    success: false,
                    error: `Etherscan API error (${
                        error.response.status
                    }): ${JSON.stringify(error.response.data)}`,
                };
            } else if (error.request) {
                Logs.error('No response from Etherscan', error.request);
                return {
                    success: false,
                    error: 'No response from Etherscan API. Check your network or API key.',
                };
            } else {
                Logs.error(
                    'Unexpected error in getEthTransactions',
                    error.message,
                );
                return {
                    success: false,
                    error: `Unexpected error: ${error.message}`,
                };
            }
        }
    }
    static async getSolTransactions(wallet) {
        try {
            const provider = await ProviderFactory.getProvider(wallet.chain);
            const pubKey = new PublicKey(wallet.walletAddress);

            const desiredLimit = 10;
            let transactions = [];
            let beforeSignature = null;

            while (transactions.length < desiredLimit) {
                const transactionSignatures =
                    await provider.connection.getSignaturesForAddress(pubKey, {
                        limit: desiredLimit - transactions.length,
                        before: beforeSignature,
                    });

                if (transactionSignatures.length === 0) break;

                const transactionPromises = transactionSignatures.map(
                    signatureInfo =>
                        provider.connection.getTransaction(
                            signatureInfo.signature,
                        ),
                );
                const transactionsData = await Promise.all(transactionPromises);

                for (let i = 0; i < transactionsData.length; i++) {
                    const transaction = transactionsData[i];

                    // Check if the transaction involves SOL transfer
                    const isSolTransfer =
                        transaction.meta?.preBalances &&
                        transaction.meta?.postBalances &&
                        transaction.meta.preBalances.length > 0 &&
                        transaction.meta.postBalances.length > 0 &&
                        transaction.meta.preBalances[0] !==
                            transaction.meta.postBalances[0];

                    if (isSolTransfer) {
                        const signatureInfo = transactionSignatures[i];
                        const txHash = signatureInfo.signature;

                        // Extract 'to' and 'from' from the transaction accounts
                        let to = null;
                        let from = null;
                        transaction.transaction.message.accountKeys.forEach(
                            (accountKey, index) => {
                                if (
                                    transaction.meta.preBalances[index] >
                                    transaction.meta.postBalances[index]
                                ) {
                                    from = accountKey.toString();
                                }
                                if (
                                    transaction.meta.preBalances[index] <
                                    transaction.meta.postBalances[index]
                                ) {
                                    to = accountKey.toString();
                                }
                            },
                        );

                        const status = transaction.meta.err ? '0' : '-1';
                        const createdAt = transaction.blockTime;
                        // const createdAt = moment(transaction.blockTime * 1000).fromNow();

                        // Calculate 'value' (SOL amount transferred)
                        let value = Math.abs(
                            transaction.meta.postBalances[0] -
                                transaction.meta.preBalances[0],
                        );
                        value /= Math.pow(10, 9); // Convert lamports to SOL

                        // Adjust value based on transaction type
                        const isSender = wallet.walletAddress === from;
                        value = isSender ? value : value;

                        const gasFee = transaction.meta.fee;
                        const explore =
                            configProperties.solana.explore + `tx/${txHash}`;
                        const type = isSender ? 'outgoing' : 'incoming';

                        transactions.push({
                            txHash,
                            to,
                            from,
                            status,
                            createdAt,
                            gasFee,
                            value,
                            isSender,
                            explore,
                            type,
                        });
                    }
                }

                beforeSignature =
                    transactionSignatures[transactionSignatures.length - 1]
                        .signature;
            }

            console.log('soltransactions:', transactions);
            return {
                success: true,
                data: transactions,
            };
        } catch (error) {
            Logs.info('WalletFactory: getTransactions', error);
            throw new Error(error.message);
        }
    }

    static async getTransactions(wallet) {
        try {
            const provider = await ProviderFactory.getProvider(wallet.chain);
            const pubKey = new PublicKey(wallet.walletAddress);

            const desiredLimit = 10;
            let transactions = [];

            const tokenAccounts =
                await provider.connection.getTokenAccountsByOwner(pubKey, {
                    mint: new PublicKey(wallet.contract),
                });

            const accountAddresses = tokenAccounts.value.map(
                account => account.pubkey,
            );

            const allSignatures = await Promise.all(
                accountAddresses.map(account =>
                    provider.connection.getSignaturesForAddress(account, {
                        limit: desiredLimit,
                    }),
                ),
            );

            const transactionSignatures = allSignatures.flat();

            if (transactionSignatures.length === 0) {
                return {
                    success: true,
                    data: transactions,
                };
            }

            const transactionsData = await Promise.all(
                transactionSignatures.map(signatureInfo =>
                    provider.connection
                        .getTransaction(signatureInfo.signature, {
                            maxSupportedTransactionVersion: 0,
                        }) // Added parameter
                        .catch(error => {
                            console.error('Error fetching transaction:', error);
                            return null;
                        }),
                ),
            );

            for (let i = 0; i < transactionsData.length; i++) {
                const transaction = transactionsData[i];
                if (
                    !transaction ||
                    !transaction.meta ||
                    !transaction.meta.postTokenBalances ||
                    !transaction.meta.preTokenBalances
                )
                    continue;

                const signatureInfo = transactionSignatures[i];
                const txHash = signatureInfo.signature;

                const tokenTransfers = transaction.meta.postTokenBalances
                    .filter(balance => balance.mint === wallet.contract)
                    .map(postBalance => {
                        const preBalance =
                            transaction.meta.preTokenBalances.find(
                                balance =>
                                    balance.mint === wallet.contract &&
                                    balance.owner === postBalance.owner,
                            );
                        const change =
                            postBalance.uiTokenAmount.uiAmount -
                            (preBalance
                                ? preBalance.uiTokenAmount.uiAmount
                                : 0);
                        return {owner: postBalance.owner, change};
                    });

                let to = null;
                let from = null;
                let value = 0;

                for (const transfer of tokenTransfers) {
                    if (transfer.change > 0) {
                        to = transfer.owner;
                        value = Math.abs(transfer.change);
                    } else if (transfer.change < 0) {
                        from = transfer.owner;
                    }
                }

                if (!to && !from) {
                    const ownerAddresses = tokenAccounts.value.map(account =>
                        account.pubkey.toBase58(),
                    );
                    if (ownerAddresses.includes(wallet.walletAddress)) {
                        to = wallet.walletAddress;
                    } else {
                        from = ownerAddresses[0];
                    }
                }

                if (!to || !from) continue;

                const status = transaction.meta.err ? '0' : '-1';
                const createdAt = transaction.blockTime;
                // ? moment(transaction.blockTime * 1000).fromNow()
                // : "N/A";
                const gasFee = transaction.meta.fee || 0;
                const isSender = wallet.walletAddress === from;
                const explore =
                    configProperties.solana.explore + `tx/${txHash}`;
                const type = isSender ? 'outgoing' : 'incoming';
                transactions.push({
                    txHash,
                    to,
                    from,
                    status,
                    createdAt,
                    gasFee,
                    value,
                    isSender,
                    explore,
                    type,
                });
            }

            console.log('Transactions:', transactions);
            return {
                success: true,
                data: transactions,
            };
        } catch (error) {
            Logs.info(
                'WalletFactory: getTransactions: An error occurred',
                error,
            );
            return {
                success: false,
                error:
                    error.message ||
                    'An unknown error occurred while fetching transactions',
            };
        }
    }
    static async getTransactions2(wallet) {
        if (!wallet || !wallet.chain || !wallet.walletAddress) {
            Logs.error(
                'WalletFactory: getTransactions2',
                'Invalid wallet or chain',
            );
            return {success: false, data: 'Invalid wallet or chain'};
        }

        try {
            const chain = wallet.chain.toUpperCase();
            // console.log('getTransactions2 chain:', chain);
            // const rawWallet = await this.getWallet(chain);
            // const {apiBaseUrl, apiKey} = rawWallet;
            let apiBaseUrl, apiKey, explorer, chainId;
            if (chain === 'BSC') {
                apiBaseUrl = configProperties.bsc.api2;
                apiKey = configProperties.bsc.keyEther;
                explorer = configProperties.bsc.explore;
                chainId = configProperties.bsc.chainId;
            } else if (chain === 'ETH') {
                apiBaseUrl = configProperties.eth.api;
                apiKey = configProperties.eth.key;
                explorer = configProperties.eth.explore;
                chainId = configProperties.eth.chainId;
            } else if (chain === 'POLYGON') {
                apiBaseUrl = configProperties.polygon.api;
                apiKey = configProperties.polygon.key;
                explorer = configProperties.polygon.explore;
                chainId = configProperties.eth.chainId;
            } else {
                Logs.error(
                    'WalletFactory: getTransactions2',
                    `Unsupported chain: ${chain}`,
                );
                return {success: false, data: `Unsupported chain ${chain}`};
            }

            // Construct API request to fetch transactions
            const response = await axios.get(apiBaseUrl, {
                params: {
                    module: 'account',
                    action: 'txs',
                    address: wallet.walletAddress,
                    startblock: 0,
                    endblock: 99999999,
                    page: 1,
                    offset: 100, // Limit to 100 transactions (adjust as needed)
                    sort: 'desc',
                    apikey: apiKey,
                },
            });

            // Check API response
            if (response.data.status !== '1') {
                throw new Error(
                    response.data.message || 'Failed to fetch transactions',
                );
            }

            // Format transactions
            const transactions = response.data.result.map(tx => ({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers.utils.formatEther(tx.value), // Convert wei to ETH/MATIC/BNB
                gasPrice: ethers.utils.formatUnits(tx.gasPrice, 'gwei'),
                gasUsed: tx.gasUsed,
                timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
                blockNumber: tx.blockNumber,
                chain: chain,
            }));

            return {
                success: true,
                data: transactions,
            };
        } catch (e) {
            Logs.error('WalletFactory: getTransactions2', e);
            console.error('WalletFactory: getTransactions2 FULL ERROR:', {
                message: e.message,
                stack: e.stack,
                response: e.response?.data,
                config: e.config,
            });
            return {
                success: false,
                data: e.reason || e.message || 'Unknown error',
            };
        }
    }
    static async getTransactionDetails(wallet, txHash) {
        try {
            const provider = await ProviderFactory.getProvider(wallet.chain);

            const transaction = await provider.connection.getTransaction(
                txHash,
            );

            if (!transaction) {
                return {
                    success: false,
                    error: 'Transaction not found',
                };
            }

            const {blockTime, meta} = transaction;

            if (!meta || !meta.postTokenBalances || !meta.preTokenBalances) {
                return {
                    success: false,
                    error: 'Transaction data is incomplete',
                };
            }

            const tokenTransfers = meta.postTokenBalances
                .filter(balance => balance.mint === wallet.contract)
                .map(postBalance => {
                    const preBalance = meta.preTokenBalances.find(
                        balance =>
                            balance.mint === wallet.contract &&
                            balance.owner === postBalance.owner,
                    );
                    const change =
                        postBalance.uiTokenAmount.uiAmount -
                        (preBalance ? preBalance.uiTokenAmount.uiAmount : 0);
                    return {owner: postBalance.owner, change};
                });

            let to = null;
            let from = null;
            let value = 0;

            for (const transfer of tokenTransfers) {
                if (transfer.change > 0) {
                    to = transfer.owner;
                    value = Math.abs(transfer.change);
                } else if (transfer.change < 0) {
                    from = transfer.owner;
                }
            }

            if (!to && !from) {
                // Handle cases where to and from are not found in tokenTransfers
                // This might involve fetching token accounts for the wallet
                // and checking their involvement in the transaction
                const tokenAccounts =
                    await provider.connection.getTokenAccountsByOwner(
                        new PublicKey(wallet.walletAddress),
                        {mint: new PublicKey(wallet.contract)},
                    );
                const ownerAddresses = tokenAccounts.value.map(account =>
                    account.pubkey.toBase58(),
                );
                if (ownerAddresses.includes(wallet.walletAddress)) {
                    to = wallet.walletAddress;
                } else {
                    from = ownerAddresses[0];
                }
            }

            if (!to || !from) {
                return {
                    success: false,
                    error: 'Could not determine sender and receiver',
                };
            }

            const status = meta.err ? '0' : '-1';
            const createdAt = blockTime;
            // ? moment(blockTime * 1000).fromNow()
            // : "N/A";
            const gasFee = meta.fee || 0;
            const isSender = wallet.walletAddress === from;
            const explore = configProperties.solana.explore + `tx/${txHash}`;
            const type = isSender ? 'outgoing' : 'incoming';

            const transactionDetails = {
                txHash,
                to,
                from,
                status,
                createdAt,
                gasFee,
                value,
                isSender,
                explore,
                type,
            };

            return {
                success: true,
                data: transactionDetails,
            };
        } catch (error) {
            Logs.info(
                'WalletFactory: getTransactionDetails: An error occurred',
                error,
            );
            return {
                success: false,
                error:
                    error.message ||
                    'An unknown error occurred while fetching transaction details',
            };
        }
    }
    static async getBalance(coins, tokens) {
        try {
            const lastTime = await StorageService.getItem('lastTime');
            if (lastTime !== undefined) {
                const currentTime = Date.now();
                if (currentTime - parseInt(lastTime, 10) <= 5000) {
                    throw new Error('Too many requests');
                }
            }
            const balanceByWallets = await this.getNativeBalance(coins);
            let balanceByTokens = [];
            if (tokens.length) {
                balanceByTokens = await this.getTokenBalance(tokens);
            }

            return {
                success: true,
                data: {
                    coins: balanceByWallets,
                    tokens: balanceByTokens,
                },
            };
        } catch (e) {
            Logs.error('WalletFactory: getBalance', {
                error: e,
                message: e.message,
                coins: coins,
                tokens: tokens,
            }); // More detailed logging

            if (e.message === 'Too many requests') {
                return {
                    success: false,
                    data: 'Rate limit exceeded. Please try again later.',
                };
            } else {
                return {
                    success: false,
                    data: 'Error fetching balances. Please try again later.',
                };
            }
        }
    }

    static destroy() {
        this.wallets = {};
    }

    static generateMnemonics(length) {
        return entropyToMnemonic(utils.randomBytes(length || 16)).split(' ');
    }

    static async getNativeBalance(wallets) {
        const updatedWallets = [];
        try {
            let requests = [];
            for (let i = 0; i < wallets.length; i++) {
                const chain = wallets[i].chain;
                let config = {
                    method: 'get',
                    url: '',
                    timeout: 13000,
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                    },
                };

                if (chain === 'SOLANA') {
                    const connection = new Connection(
                        'https://solana-mainnet.core.chainstack.com/2ef19b6485a2171959b47e653266c846',
                    );
                    requests.push(
                        connection
                            .getBalance(new PublicKey(wallets[i].walletAddress))
                            .then(balance => ({
                                data: { balance },
                                chain,
                                walletAddress: wallets[i].walletAddress,
                            }))
                            .catch(err => {
                                console.error(
                                    `Error getting Solana balance for ${wallets[i].walletAddress}:`,
                                    err,
                                );
                                return {
                                    data: { balance: 0 },
                                    chain,
                                    walletAddress: wallets[i].walletAddress,
                                    error: err.message,
                                };
                            }),
                    );
                } else if (chain === 'TRON') {
                    // Validate Tron address format
                    if (!wallets[i].walletAddress || wallets[i].walletAddress.length < 34) {
                        console.warn(`Invalid Tron address: ${wallets[i].walletAddress}`);
                        requests.push(Promise.resolve({
                            data: { balance: 0 },
                            chain,
                            walletAddress: wallets[i].walletAddress,
                            error: 'Invalid address format'
                        }));
                        continue;
                    }
                    
                    config.url = `${configProperties.tron.api}walletsolidity/getaccount`;
                    config.method = 'post';
                    config.data = {
                        address: wallets[i].walletAddress,
                        visible: true,
                    };
                    config.headers = {
                        'TRON-PRO-API-KEY': configProperties.tron.key,
                        'Content-Type': 'application/json'
                    };
                    
                    requests.push(
                        axios(config)
                            .then(response => ({
                                data: response.data,
                                chain,
                                walletAddress: wallets[i].walletAddress,
                            }))
                            .catch(err => {
                                console.warn(
                                    `No balance found for Tron address ${wallets[i].walletAddress}:`,
                                    err.response?.status === 400 ? 'Address not found or invalid' : err.message
                                );
                                return {
                                    data: { balance: 0 },
                                    chain,
                                    walletAddress: wallets[i].walletAddress,
                                    error: err.response?.status === 400 ? 'Address not found' : err.message,
                                };
                            }),
                    );
                } else if (
                    chain === 'ETH' ||
                    chain === 'BSC' ||
                    chain === 'POLYGON'
                ) {
                    config.url = `${configProperties.moralis.api}/v2/${
                        wallets[i].walletAddress
                    }/balance?chain=${chain.toLowerCase()}`;
                    config.headers['X-API-Key'] = configProperties.moralis.key;
                    requests.push(
                        axios(config)
                            .then(response => ({
                                data: response.data,
                                chain,
                                walletAddress: wallets[i].walletAddress,
                            }))
                            .catch(err => {
                                console.error(
                                    `Error getting ${chain} balance for ${wallets[i].walletAddress}:`,
                                    err.message,
                                );
                                return {
                                    data: { balance: 0 },
                                    chain,
                                    walletAddress: wallets[i].walletAddress,
                                    error: err.message,
                                };
                            }),
                    );
                }
            }

            const chunks = _.chunk(requests, 5);
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                let results = await Promise.all(chunk);
                for (let index = 0; index < results.length; index++) {
                    const result = results[index];
                    const position = i * 5 + index;
                    let balance = 0;

                    if (result.error) {
                        console.warn(
                            `Failed to fetch balance for ${result.walletAddress} on ${result.chain}: ${result.error}`,
                        );
                    }

                    if (wallets[position].chain === 'SOLANA') {
                        const balanceData = result.data;
                        if (!_.isEmpty(balanceData)) {
                            balance = balanceData.balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
                        }
                    } else if (wallets[position].chain === 'TRON') {
                        const account = result.data;
                        if (!_.isEmpty(account) && account.balance !== undefined) {
                            balance = account.balance / 1_000_000; // Convert from SUN to TRX
                        } else {
                            console.warn(
                                `No balance found for Tron address ${wallets[position].walletAddress}:`,
                                account,
                            );
                        }
                    } else if (
                        ['ETH', 'BSC', 'POLYGON'].includes(
                            wallets[position].chain,
                        )
                    ) {
                        const balanceData = result.data;
                        if (!_.isEmpty(balanceData) && balanceData.balance) {
                            balance = formatEther(balanceData.balance); // Convert from Wei
                        } else {
                            console.warn(
                                `Invalid ${wallets[position].chain} response for ${wallets[position].walletAddress}:`,
                                balanceData,
                            );
                        }
                    }

                    updatedWallets.push({
                        ...wallets[position],
                        balance: parseFloat(balance), // Ensure balance is a number
                    });
                }
            }

            return updatedWallets;
        } catch (e) {
            console.error('WalletFactory: getNativeBalance error:', e);
            return wallets;
        }
    }
    static async getTokenBalance(tokens) {
        const tokensByChain = _.groupBy(tokens, 'chain');
        const requests = [];

        for (const [key, value] of Object.entries(tokensByChain)) {
            if (key === 'SOLANA') {
                var url =
                    'https://solana-mainnet.core.chainstack.com/2ef19b6485a2171959b47e653266c846';
                const payload = {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTokenAccountsByOwner',
                    params: [
                        value[0].walletAddress,
                        {mint: ''},
                        {encoding: 'jsonParsed'},
                    ],
                };
                value.map(function (item) {
                    payload.params[1].mint = item.contract;
                    payload.params[0] = item.walletAddress;

                    requests.push(
                        axios.post(url, payload, {
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        }),
                    );
                });
            } else if (key === 'TRON') {
                requests.push(
                    axios.get(
                        `${configProperties.tron.api2}account?address=${value[0].walletAddress}`,
                        {
                            timeout: 5000,
                        },
                    ),
                );
            } else if (key === 'ETH' || key === 'BSC' || key === 'POLYGON') {
                const tokenAddresses = _.map(
                    value,
                    token => token.contract,
                ).join('&token_addresses=');
                requests.push(
                    axios.get(
                        `${configProperties.moralis.api}/v2/${
                            value[0].walletAddress
                        }/erc20?chain=${key?.toLowerCase()}&token_addresses=${tokenAddresses}`,
                        {
                            headers: {
                                'X-API-Key': configProperties.moralis.key,
                            },
                            timeout: 5000,
                        },
                    ),
                );
            }
        }
        const results = await Promise.all(requests);
        var updatedTokens = tokens.map(token => {
            let balance = 0;
            if (token.chain === 'ETH' || token.chain === 'POLYGON') {
                const tokenBalance = results.find(result =>
                    result.data.find(
                        t =>
                            t.token_address?.toLowerCase() ===
                            token.contract?.toLowerCase(),
                    ),
                );
                balance = tokenBalance?.data?.balance
                    ? ethers.utils.formatUnits(
                          tokenBalance.data.balance,
                          token.decimals,
                      )
                    : '0';
            } else if (token.chain === 'TRON') {
                const tokenBalance = results.find(result =>
                    result.data.trc20token_balances.find(
                        t => t.tokenId === token.contract,
                    ),
                );
                balance = tokenBalance?.data?.trc20token_balances.find(
                    t => t.tokenId === token.contract,
                )?.balance
                    ? ethers.utils.formatUnits(
                          tokenBalance.data.trc20token_balances.find(
                              t => t.tokenId === token.contract,
                          ).balance,
                          token.decimals,
                      )
                    : '0';
            } else if (token.chain === 'SOLANA' || token.chain === 'BSC') {
                results.map(item => {
                    var data = item.data;
                    if (data.result.value.length) {
                        var validate =
                            data !== null &&
                            typeof data === 'object' &&
                            !Array.isArray(data);
                        if (validate) {
                            var tokenAmount =
                                data.result.value[0].account.data.parsed.info
                                    .tokenAmount.uiAmount;
                            var mint =
                                data.result.value[0].account.data.parsed.info
                                    .mint;
                            if (mint == token.contract) {
                                balance = tokenAmount;
                            }
                        }
                    }
                });
            }
            return {...token, balance};
        });
        return updatedTokens;
    }
}
