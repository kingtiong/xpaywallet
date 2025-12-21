import 'react-native-get-random-values';
import '@ethersproject/shims';
import {ethers} from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import {bip32} from 'bitcoinjs-lib';
import {mnemonicToSeedSync} from 'bip39';
import {derivePath as deriveEd25519Path} from 'ed25519-hd-key';
import {Keypair} from '@solana/web3.js';
import TronWeb from 'tronweb';

export async function deriveAllAccounts(mnemonic, index = 0) {
    const evm = deriveEvmAccount(mnemonic, index);
    const btc = deriveBtcAccount(mnemonic, index);
    const tron = deriveTronAccount(mnemonic, index);
    const sol = deriveSolAccount(mnemonic, index);
    return {evm, btc, tron, sol};
}

export function deriveEvmAccount(mnemonic, index = 0) {
    const path = `m/44'/60'/0'/0/${index}`;
    const wallet = ethers.Wallet.fromMnemonic(mnemonic, path);
    return {address: wallet.address, privateKey: wallet.privateKey};
}

export function deriveBtcAccount(mnemonic, index = 0, network = bitcoin.networks.bitcoin) {
    // Native segwit (bech32): m/84'/0'/0'/0/index
    const seed = mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, network);
    const node = root.derivePath(`m/84'/0'/0'/0/${index}`);
    const {address} = bitcoin.payments.p2wpkh({pubkey: node.publicKey, network});
    return {address, wif: node.toWIF()};
}

export function deriveTronAccount(mnemonic, index = 0) {
    // Tron commonly uses: m/44'/195'/0'/0/index
    const path = `m/44'/195'/0'/0/${index}`;
    const wallet = ethers.Wallet.fromMnemonic(mnemonic, path);
    const tronAddress = TronWeb.address.fromPrivateKey(wallet.privateKey);
    return {address: tronAddress, privateKey: wallet.privateKey};
}

export function deriveSolAccount(mnemonic, index = 0) {
    // Solana common path: m/44'/501'/index'/0'
    const seed = mnemonicToSeedSync(mnemonic);
    const derived = deriveEd25519Path(`m/44'/501'/${index}'/0'`, seed.toString('hex')).key;
    const keypair = Keypair.fromSeed(derived);
    return {address: keypair.publicKey.toBase58(), secretKey: Buffer.from(keypair.secretKey)};
}

