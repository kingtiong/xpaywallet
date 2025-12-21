import {entropyToMnemonic, validateMnemonic, wordlists} from '@scure/bip39';
import {randomBytes} from 'ethers/lib/utils';

export function generateMnemonic(entropyBits = 128) {
    const bytes = entropyBits / 8;
    const entropy = randomBytes(bytes);
    return entropyToMnemonic(entropy, wordlists.english);
}

export function normalizeMnemonic(input) {
    return String(input || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

export function isValidMnemonic(mnemonic) {
    const normalized = normalizeMnemonic(mnemonic);
    return validateMnemonic(normalized, wordlists.english);
}

