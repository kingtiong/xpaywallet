import {Logs} from '@modules/log/logs';
import {ProviderFactory} from '@modules/core/factory/ProviderFactory';
export class VCoinPlatform {
    static async init() {
        try {
            initProvider();
        } catch (e) {
            Logs.info('App: init', e);
        }
    }
}

const initProvider = () => {
    ProviderFactory.init([
        {
            chain: 'ETH',
            chainId: 1,
            rpcUrl: 'https://rpc.ankr.com/eth',
            apiEndpoint: 'https://api.etherscan.io/api',
            apiKey: '',
            testnet: false,
        },
        {
            chain: 'BSC',
            rpcUrl: 'https://bsc-dataseed1.defibit.io/',
            chainId: 56,
            apiEndpoint: 'https://api.bscscan.com/api',
            apiKey: '',
            testnet: false,
        },
        {
            chain: 'POLYGON',
            rpcUrl: 'https://polygon-rpc.com',
            chainId: 137,
            apiEndpoint: 'https://api.polygonscan.com/api',
            apiKey: '',
            testnet: false,
        },
        {
            chain: 'TRON',
            rpcUrl: 'https://api.trongrid.io/',
            apiEndpoint: 'https://api.trongrid.io/',
            apiKey: '',
            testnet: false,
        },
        {
            chain:'SOLANA',
            rpcUrl:'https://api.mainnet-beta.solana.com',
            apiEndpoint:'https://public-api.solscan.io/',
            apiKey: '',
        },
    ]);
};
