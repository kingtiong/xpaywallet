import bip39 from 'bip39';
import {ethers} from 'ethers';
import TronWeb from 'tronweb';
import * as bitcoin from 'bitcoinjs-lib';
import {derivePath as deriveEd25519Path} from 'ed25519-hd-key';
import {Keypair} from '@solana/web3.js';
import {Buffer} from 'buffer';

// bip32 v4 requires an ECC implementation. We use tiny-secp256k1.
import ecc from 'tiny-secp256k1';
import {BIP32Factory} from 'bip32';

import {DERIVATION_PATHS} from './paths';

const bip32 = BIP32Factory(ecc);

function toHex(bytes) {
    return Buffer.from(bytes).toString('hex');
}

export function deriveEvmAddress(mnemonic) {
    const wallet = ethers.Wallet.fromMnemonic(mnemonic, DERIVATION_PATHS.evm);
    return wallet.address;
}

export function deriveTronAddress(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed);
    const node = root.derivePath(DERIVATION_PATHS.tron);
    if (!node.privateKey) throw new Error('Failed to derive TRON private key.');
    const pkHex = toHex(node.privateKey);
    return TronWeb.address.fromPrivateKey(pkHex);
}

export function deriveBitcoinBech32Address(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);
    const child = root.derivePath(DERIVATION_PATHS.bitcoin84);

    const {address} = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin,
    });

    if (!address) throw new Error('Failed to derive BTC address.');
    return address;
}

export function deriveSolanaAddress(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const derived = deriveEd25519Path(
        DERIVATION_PATHS.solana,
        seed.toString('hex'),
    );

    const kp = Keypair.fromSeed(Uint8Array.from(derived.key));
    return kp.publicKey.toBase58();
}

export function deriveAllAddresses(mnemonic) {
    return {
        bitcoin: deriveBitcoinBech32Address(mnemonic),
        evm: deriveEvmAddress(mnemonic),
        tron: deriveTronAddress(mnemonic),
        solana: deriveSolanaAddress(mnemonic),
    };
}

