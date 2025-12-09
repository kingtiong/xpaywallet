import CommonAPI from '@modules/api/CommonAPI';
import {StorageService} from '@modules/core/storage/StorageService';
import {WalletFactory} from '@modules/core/factory/WalletFactory';

export const UserService = {
    get,
    signIn,
    signOut,
};

async function get() {
    return (
        (await StorageService.getItem('USER')) || {registered: false, user: {}}
    );
}

async function signIn() {
    try {
        const ethWallet = await WalletFactory.getWallet('ETH');
        if (!ethWallet || !ethWallet.data?.walletAddress) {
            throw new Error(
                'No Ethereum wallet found. Please finish creating a wallet before registering.',
            );
        }

        const message = Date.now().toString();
        const signedHash = await ethWallet.sign(message);
        const {success, data} = await CommonAPI.post(
            '/api/v1/auth/authenticate',
            {
                address: ethWallet.data.walletAddress,
                signedHash,
                message,
            },
        );

        if (success === true) {
            const user = {
                user: data,
                registered: true,
            };
            await StorageService.setItem('USER', user);
            await StorageService.setItem('loggedIn', true);
            await CommonAPI.setAuthorization(data.access_token);
        }

        return {success, data};
    } catch (error) {
        console.error('UserService.signIn failed', error);
        return {
            success: false,
            data:
                error?.message ||
                'Unable to complete registration. Please try again.',
        };
    }
}

async function signOut() {
    return await CommonAPI.post('/api/v1/auth/sign-out', {});
}
