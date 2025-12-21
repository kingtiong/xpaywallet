export const CHAINS = {
    bitcoin: {
        id: 'bitcoin',
        name: 'Bitcoin',
        symbol: 'BTC',
    },
    ethereum: {
        id: 'ethereum',
        name: 'Ethereum',
        symbol: 'ETH',
        chainId: 1,
        rpcUrl: 'https://rpc.ankr.com/eth',
    },
    bsc: {
        id: 'bsc',
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        chainId: 56,
        rpcUrl: 'https://bsc-dataseed.binance.org',
    },
    tron: {
        id: 'tron',
        name: 'Tron',
        symbol: 'TRX',
        fullNode: 'https://api.trongrid.io',
        solidityNode: 'https://api.trongrid.io',
        eventServer: 'https://api.trongrid.io',
    },
    solana: {
        id: 'solana',
        name: 'Solana',
        symbol: 'SOL',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
    },
};

