import EncryptedStorage from 'react-native-encrypted-storage';

const KEY_MNEMONIC = '@clean_wallet/mnemonic';

export const vault = {
    async hasMnemonic() {
        const v = await EncryptedStorage.getItem(KEY_MNEMONIC);
        return Boolean(v);
    },

    async saveMnemonic(mnemonic) {
        if (!mnemonic) throw new Error('Mnemonic is required');
        await EncryptedStorage.setItem(KEY_MNEMONIC, String(mnemonic));
    },

    async loadMnemonic() {
        const v = await EncryptedStorage.getItem(KEY_MNEMONIC);
        return v ? String(v) : null;
    },

    async clear() {
        await EncryptedStorage.removeItem(KEY_MNEMONIC);
    },
};

