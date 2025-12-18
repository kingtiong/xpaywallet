import 'react-native-get-random-values';
import '@ethersproject/shims';
import {Logs} from '@modules/log/logs';
import {EthProvider} from '@modules/core/provider/eth/EthProvider';
import {BigNumber, ethers, Wallet} from 'ethers';
import {ProviderFactory} from '@modules/core/factory/ProviderFactory';
import {formatUnits, parseEther, parseUnits} from 'ethers/lib/utils';
import * as Bip39 from 'bip39';
import {hdkey} from 'ethereumjs-wallet';
import Web3 from 'web3';
import {
    signTypedData as web3SignTypeData,
    SignTypedDataVersion,
} from '@metamask/eth-sig-util';
import {toBuffer} from 'ethereumjs-util';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class EthWallet implements Wallet {
    provider: EthProvider;
    data: Object;
    signer: Wallet;
    web3Signer: Web3;

    constructor(provider: EthProvider) {
        this.provider = provider;
    }

    setData(data) {
        this.data = data;
    }

    setSigner(signer) {
        this.signer = signer.connect(this.provider.provider);
        const web3 = new Web3(this.provider.provider.connection.url);
        web3.eth.accounts.wallet.add(this.signer.privateKey);
        web3.eth.defaultAccount = this.signer.address;
        this.web3Signer = web3;
    }

    async mnemonicToSeed(mnemonic, passphrase = '') {
        // Use the pure-JS BIP39 implementation to avoid relying on native crypto
        // modules during bundling/testing.
        const seed = await Bip39.mnemonicToSeed(mnemonic, passphrase);
        return seed.toString('hex');
    }

    async saveMnemonic(mnemonic: string) {
        await AsyncStorage.setItem('walletMnemonic', mnemonic);
    }

    async getMnemonic(): Promise<string | null> {
        return await AsyncStorage.getItem('walletMnemonic');
    }

    async fromMnemonic(data, mnemonic): Promise<Object> {
        try {
            const mnemonicToUse = mnemonic || (await this.getMnemonic());
            if (!mnemonicToUse) {
                throw new Error('No mnemonic provided or stored');
            }
            console.log('Mnemonic used:', mnemonicToUse);
            const provider = await ProviderFactory.getProvider(data.chain);
            const wallet = await this.createWallet(
                mnemonicToUse,
                0,
                provider.provider,
            );
            this.setSigner(wallet);
            await this.saveMnemonic(mnemonicToUse);
            console.log('Generated address:', wallet.address);
            return {
                success: true,
                data: {
                    ...data,
                    walletAddress: wallet.address,
                    privateKey: wallet.privateKey,
                },
            };
        } catch (e) {
            Logs.info('EthWallet: fromMnemonic', e);
            return {
                success: false,
                data: {
                    ...data,
                },
            };
        }
    }

    async createWallet(mnemonic, index = 0, provider): Promise<Wallet> {
        console.log('Derivation index:', index);
        const path = `m/44'/60'/0'/0/${index}`;
        const wallet = ethers.Wallet.fromMnemonic(mnemonic, path);
        console.log('Derived address:', wallet.address);
        return wallet.connect(provider);
    }

    async fromPrivateKey(data): Promise<Object> {
        try {
            const provider = await ProviderFactory.getProvider(data.chain);
            const wallet = new ethers.Wallet(
                data.privateKey,
                provider.provider,
            );
            this.setSigner(wallet);
            return {
                success: true,
                data: {
                    ...data,
                },
            };
        } catch (e) {
            Logs.info('EthWallet: fromPrivateKey', e);
            return {
                success: false,
                data: {
                    ...data,
                },
            };
        }
    }

    async sendTransaction(transaction): Promise<Object> {
        if (transaction.tokenContractAddress) {
            return this.sendToken(transaction);
        }
        return this.sendNative(transaction);
    }

    async sendNative(transaction): Promise<Object> {
        try {
            const {to, value, gasPrice, gasLimit, takerFee, takerAddress} =
                transaction;
            let tx,
                txFee = '';
            tx = await this.executeNative(
                to,
                parseEther(value.toString()),
                gasPrice,
                gasLimit,
            );
            let takerAmount = 0;
            if (takerFee && takerAddress) {
                takerAmount = (takerFee * parseEther(value.toString())) / 100;
                await tx.wait(3);
                txFee = await this.executeNative(
                    takerAddress,
                    takerAmount,
                    gasPrice,
                    gasLimit,
                );
            }
            return {
                success: true,
                data: {
                    ...transaction,
                    takerAmount: formatUnits(takerAmount.toString()),
                    tx,
                    txFee,
                },
            };
        } catch (e) {
            Logs.info('EthWallet: sendNative', e);
            return {
                success: false,
                data: e.reason,
            };
        }
    }

    async executeNative(to, value, gasPrice, gasLimit) {
        return await this.signer.sendTransaction({
            to: to,
            value: value,
            gasPrice: gasPrice,
            gasLimit: gasLimit,
        });
    }

    async sendToken(transaction): Promise<Object> {
        try {
            let tx,
                txFee = '';
            const {
                value,
                takerFee,
                takerAddress,
                decimals,
                tokenContractAddress,
                gasLimit,
                gasPrice,
            } = transaction;
            tx = await this.executeToken({
                ...transaction,
                value: parseUnits(value.toString(), decimals).toString(),
            });
            await this.signer.sendTransaction({...tx, gasLimit, gasPrice});
            let takerAmount = 0;
            if (takerFee && takerAddress) {
                takerAmount =
                    (takerFee * parseUnits(value.toString(), decimals)) / 100;
                txFee = await this.executeToken({
                    ...transaction,
                    to: takerAddress,
                    value: takerAmount.toString(),
                    tokenContractAddress,
                });
                await this.signer.sendTransaction({
                    ...txFee,
                    gasLimit,
                    gasPrice,
                });
            }
            return {
                success: true,
                data: {
                    ...transaction,
                    takerAmount: formatUnits(takerAmount.toString(), decimals),
                    tx,
                    txFee,
                },
            };
        } catch (e) {
            Logs.info('EthWallet: sendToken', e);
            return {
                success: false,
                data: e.reason,
            };
        }
    }

    async executeToken(transaction) {
        const {to, value, tokenContractAddress} = transaction;
        return await this.provider.transferToken({
            signer: this.signer,
            tokenContractAddress,
            to,
            value,
        });
    }

    async getTransactions(wallet): Promise<Object> {
        try {
            const provider = await ProviderFactory.getProvider(wallet.chain);
            return {
                success: true,
                data: await provider.getTransactions2(wallet),
            };
        } catch (e) {
            Logs.info('EthWallet: getTransactions', e);
            return {
                success: false,
                data: [],
            };
        }
    }

    async sign(dataToSign) {
        return this.web3Signer.eth.accounts.sign(
            dataToSign,
            this.data.privateKey,
        ).signature;
    }

    async signTypedData(dataToSign: any) {
        console.log(this.data.privateKey);
        let privateKeyBuffer = toBuffer(this.data.privateKey);
        return web3SignTypeData({
            privateKey: privateKeyBuffer,
            data: dataToSign,
            version: SignTypedDataVersion.V3,
        });
    }

    async signTransaction(transactionObject) {
        return (
            await this.web3Signer.eth.accounts.signTransaction(
                transactionObject,
                this.data.privateKey,
            )
        ).rawTransaction;
    }

    async sendRawTransaction(tx) {
        return this.web3Signer.eth.sendSignedTransaction(tx);
    }
}