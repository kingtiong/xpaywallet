import '@walletconnect/react-native-compat';
import {Core} from '@walletconnect/core';
import {Web3Wallet} from '@walletconnect/web3wallet';
import {wcConfig} from './wcConfig';

/**
 * Minimal WalletConnect v2 scaffolding.
 *
 * This does NOT yet implement full request routing (signing / tx approvals).
 * It is enough to pair and observe sessions, and provides a clear place to add handlers.
 */
export class TrustLikeWalletConnectService {
    static _core = null;
    static _wallet = null;
    static _initialized = false;

    static get isReady() {
        return !!TrustLikeWalletConnectService._wallet;
    }

    static async init() {
        if (TrustLikeWalletConnectService._initialized) return;
        TrustLikeWalletConnectService._initialized = true;

        if (!wcConfig.projectId) {
            // Intentionally do not throw: UI can show a friendly message.
            return;
        }

        TrustLikeWalletConnectService._core = new Core({
            projectId: wcConfig.projectId,
        });

        TrustLikeWalletConnectService._wallet = await Web3Wallet.init({
            core: TrustLikeWalletConnectService._core,
            metadata: wcConfig.metadata,
        });

        TrustLikeWalletConnectService._wallet.on(
            'session_proposal',
            proposal => {
                // TODO: implement approval UI + namespaces mapping (EVM + Solana).
                console.log('[TrustLikeWC] session_proposal', proposal?.id);
            },
        );

        TrustLikeWalletConnectService._wallet.on('session_request', request => {
            // TODO: implement signing/transaction handling.
            console.log('[TrustLikeWC] session_request', request?.id);
        });

        TrustLikeWalletConnectService._wallet.on('session_delete', event => {
            console.log('[TrustLikeWC] session_delete', event?.id);
        });
    }

    static async pair(uri) {
        await TrustLikeWalletConnectService.init();
        if (!TrustLikeWalletConnectService._wallet) {
            throw new Error(
                'WalletConnect is not configured. Set wcConfig.projectId first.',
            );
        }
        await TrustLikeWalletConnectService._wallet.core.pairing.pair({uri});
    }

    static async getActiveSessions() {
        if (!TrustLikeWalletConnectService._wallet) return {};
        return TrustLikeWalletConnectService._wallet.getActiveSessions();
    }
}

