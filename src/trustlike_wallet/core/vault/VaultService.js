import * as Keychain from 'react-native-keychain';
import bip39 from 'bip39';

const SERVICE = 'trustlike_wallet_vault_v1';

export class VaultService {
    static async hasWallet() {
        const creds = await Keychain.getGenericPassword({service: SERVICE});
        return !!(creds && creds.password);
    }

    static async loadMnemonic() {
        const creds = await Keychain.getGenericPassword({service: SERVICE});
        if (!creds || !creds.password) return null;
        return creds.password;
    }

    static async createWallet() {
        const mnemonic = bip39.generateMnemonic(128); // 12 words
        await VaultService.saveMnemonic(mnemonic);
        return mnemonic;
    }

    static async restoreWallet(mnemonic) {
        const normalized = String(mnemonic)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');

        if (!bip39.validateMnemonic(normalized)) {
            throw new Error('Invalid recovery phrase (mnemonic).');
        }

        await VaultService.saveMnemonic(normalized);
        return normalized;
    }

    static async saveMnemonic(mnemonic) {
        // Stored in OS secure storage (Keychain/Keystore).
        await Keychain.setGenericPassword('mnemonic', String(mnemonic), {
            service: SERVICE,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
    }

    static async wipe() {
        await Keychain.resetGenericPassword({service: SERVICE});
    }
}

