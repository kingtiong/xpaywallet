import moment from 'moment';
import {
    DEFAULT_WALLET,
    WALLET_LIST_KEY,
} from '@persistence/wallet/WalletConstant';
import {
    DEFAULT_STOCK,
    STOCK_LIST_KEY,
} from '@persistence/wallet/StockConstant';
import _ from 'lodash';
import {WalletFactory} from '@modules/core/factory/WalletFactory';
import {
    ASSET_TYPE_TOKEN,
    CHAIN_ID_TYPE_MAP,
} from '@modules/core/constant/constant';
import {StorageService} from '@modules/core/storage/StorageService';
import {Logs} from '@modules/core/log/logs';
import {PriceService} from '@persistence/price/PriceService';
import ReduxStore from '@modules/redux/ReduxStore';
import {applicationProperties} from '@src/application.properties';

export const WalletService = {
    insert,
    setActiveWallet,
    findAll,
    balance,
    addAsset,
    removeAsset,
    setActiveAsset,
    getActiveAsset,
    update,
    remove,
    getActiveWallet,
};

async function insert({
    name,
    type,
    defaultChain,
    mnemonic,
    privateKey,
    coins: coinsParam,
    tokens: tokenParam,
    logoURI,
    chain,
}) {
    try {
        const walletListData = await StorageService.getItem(WALLET_LIST_KEY);
        const walletList = walletListData?.wallets
            ? [...walletListData.wallets]
            : [];

        const baseCoins = _.cloneDeep(coinsParam || DEFAULT_WALLET.coins || []);
        const baseTokens = _.cloneDeep(
            tokenParam || DEFAULT_WALLET.tokens || [],
        );

        const derivationTargets = [...baseCoins, ...baseTokens];

        if (!mnemonic && !privateKey) {
            throw new Error('A mnemonic or private key is required.');
        }

        const normalizedPrivateKey =
            privateKey && !_.isString(privateKey)
                ? privateKey.toString()
                : privateKey;

        const walletData = mnemonic
            ? await WalletFactory.fromMnemonic(derivationTargets, mnemonic)
            : await WalletFactory.fromPrivateKey(
                  derivationTargets,
                  normalizedPrivateKey,
              );

        const coins = walletData?.coins || walletData?.wallets || [];
        const tokens = walletData?.tokens || [];

        if (!coins.length) {
            throw new Error('Failed to derive wallet addresses.');
        }

        const activeAsset =
            _.find(coins, {id: 'ethereum'}) || _.first(coins) || null;
        const wallet = {
            id: moment().format('YYYYMMDDhhmmss'),
            name: name || applicationProperties.defaultWalletName,
            type: type || DEFAULT_WALLET.type,
            logoUri: logoURI,
            defaultChain: defaultChain || DEFAULT_WALLET.defaultChain,
            mnemonic: mnemonic,
            coins,
            totalBalance: 0.0,
            activeAsset,
            tokens,
            chain: chain || DEFAULT_WALLET.chain,
        };
        walletList.push(wallet);
        await StorageService.setItem(WALLET_LIST_KEY, {
            wallets: walletList,
            activeWallet: wallet,
        });
        return {
            success: true,
            data: {
                wallets: walletList,
                activeWallet: wallet,
            },
        };
    } catch (error) {
        Logs.info('WalletService: insert' + error);
        return {
            success: false,
            data: error?.message || {},
        };
    }
}

async function update(wallet) {
    try {
        const {wallets, activeWallet} = await StorageService.getItem(
            WALLET_LIST_KEY,
        );
        let index = _.findIndex(wallets, {id: wallet.id});
        wallets.splice(index, 1, wallet);
        if (activeWallet.id === wallet.id) {
            activeWallet.name = wallet.name;
        }
        await StorageService.setItem(WALLET_LIST_KEY, {
            wallets: wallets,
            activeWallet: activeWallet,
        });
        return {
            success: true,
            data: {wallets: wallets, activeWallet: activeWallet},
        };
    } catch (error) {
        Logs.info('WalletService: update' + error);
        return {
            success: false,
            data: error,
        };
    }
}

async function remove(wallet) {
    try {
        const {wallets, activeWallet} = await StorageService.getItem(
            WALLET_LIST_KEY,
        );
        if (activeWallet.id === wallet.id) {
            return;
        }
        _.remove(wallets, {id: wallet.id});
        await StorageService.setItem(WALLET_LIST_KEY, {
            wallets: wallets,
            activeWallet: activeWallet,
        });
        return {
            success: true,
            data: {wallets: wallets, activeWallet: activeWallet},
        };
    } catch (error) {
        Logs.info('WalletService: remove' + error);
        return {
            success: false,
            data: error,
        };
    }
}

async function setActiveWallet(wallet) {
    try {
        const {wallets} = await StorageService.getItem(WALLET_LIST_KEY);
        const {coins, tokens} = await WalletFactory.fromMnemonic(
            [...wallet.coins, ...wallet.tokens],
            wallet.mnemonic,
        );
        wallet.coins = coins;
        wallet.tokens = tokens;
        await StorageService.setItem(WALLET_LIST_KEY, {
            wallets: wallets,
            activeWallet: wallet,
        });
        return {
            success: true,
            data: {wallets: wallets, activeWallet: wallet},
        };
    } catch (error) {
        Logs.info('WalletService: setActiveWallet' + error);
        return {
            success: false,
            data: error,
        };
    }
}

async function findAll() {
    try {
        const walletData = await StorageService.getItem(WALLET_LIST_KEY);
        const activeWallet = walletData.activeWallet;
        const {coins, tokens} = await WalletFactory.fromPrivateKey([
            ...activeWallet.coins,
            ...activeWallet.tokens,
        ]);
        activeWallet.coins = coins;
        activeWallet.tokens = tokens;
        return {
            success: true,
            data: {
                wallets: walletData.wallets,
                activeWallet: activeWallet,
            },
        };
    } catch (error) {
        return {
            success: false,
            data: {},
        };
    }
}

async function addAsset(asset) {
    try {
        const walletData = await StorageService.getItem(WALLET_LIST_KEY);
        const wallets = walletData.wallets;
        const activeWallet = walletData.activeWallet;
        const chain = CHAIN_ID_TYPE_MAP[asset.chainId];
        const wallet = _.find(activeWallet.coins, {chain: chain});
        const tokens = activeWallet.tokens;
        let token = {
            symbol: asset.symbol.toUpperCase(),
            name: asset.name,
            id: asset.id,
            chain: chain,
            type: ASSET_TYPE_TOKEN,
            decimals: asset.decimals,
            contract: asset.address || null,
            privateKey: wallet.privateKey,
            balance: 0,
            unconfirmedBalance: 0,
            usdValue: 0,
            active: true,
            logoURI: asset.logoURI || null,
            walletAddress: wallet.walletAddress,
        };
        token = (await WalletFactory.getTokenBalance([token]))[0];
        tokens.push(token);
        activeWallet.tokens = tokens;
        let index = _.findIndex(wallets, {id: activeWallet.id});
        wallets.splice(index, 1, activeWallet);
        await StorageService.setItem(WALLET_LIST_KEY, {
            wallets: wallets,
            activeWallet: activeWallet,
        });
        return {
            success: true,
            data: {wallets: wallets, activeWallet: activeWallet},
        };
    } catch (error) {
        return {
            success: false,
            data: {},
        };
    }
}

async function removeAsset(asset) {
    try {
        const walletData = await StorageService.getItem(WALLET_LIST_KEY);
        const wallets = walletData.wallets;
        const activeWallet = walletData.activeWallet;
        const tokens = activeWallet.tokens;
        _.remove(tokens, {contract: asset.address});
        activeWallet.tokens = tokens;
        let index = _.findIndex(wallets, {id: activeWallet.id});
        wallets.splice(index, 1, activeWallet);
        await StorageService.setItem(WALLET_LIST_KEY, {
            wallets: wallets,
            activeWallet: activeWallet,
        });
        return {
            success: true,
            data: {wallets: wallets, activeWallet: activeWallet},
        };
    } catch (error) {
        return {
            success: false,
            data: {},
        };
    }
}

async function balance() {
    try {
        const { activeWallet, wallets } = await StorageService.getItem(WALLET_LIST_KEY);

        let coins = activeWallet.coins;
        let tokens;

        if (activeWallet.tokens.length) {
            tokens = activeWallet.tokens;
        } else {
            if (wallets.length > 0) {
                for (let i = 0; i < wallets.length; i++) {
                    if (wallets[i].tokens.length > 0) {
                        tokens = wallets[i].tokens;
                    } else {
                        tokens = [];
                    }
                }
            }
        }

        const { success, data } = await WalletFactory.getBalance(coins, tokens);

        if (success) {
            activeWallet.coins = data.coins;
            activeWallet.tokens = data.tokens;
            activeWallet.activeAsset = _.find([...data.coins, ...data.tokens], {
                symbol: activeWallet.activeAsset.symbol,
                chain: activeWallet.activeAsset.chain,
            });

            const { prices } = ReduxStore.getState().PriceReducer;

            // Fetch latest prices from localStorage
            const [bitcoinPrice, ethPrice, dogePrice, ltcPrice, usdcPrice] = await Promise.all([
                StorageService.getItem('latestBitcoinPrice'),
                StorageService.getItem('latestEthPrice'),
                StorageService.getItem('latestDogePrice'),
                StorageService.getItem('latestLtcPrice'),
                StorageService.getItem('latestUsdcPrice'),
            ]).then((prices) => prices.map((price) => parseFloat(price) || 0));

            activeWallet.totalBalance = Object.values([...data.coins, ...data.tokens]).reduce((sum, o) => {
                const staticPrices = {
                    xusdt: 1,
                    mxg: 0.9805,
                    // ... other static prices
                };

                let price;
                switch (o.id.toLowerCase()) {
                    case 'btc':
                        price = bitcoinPrice;
                        break;
                    case 'eths':
                        price = ethPrice;
                        break;
                    case 'doge':
                        price = dogePrice;
                        break;
                    case 'ltc':
                        price = ltcPrice;
                        break;
                    case 'usdc':
                        price = usdcPrice;
                        break;
                    // ... other cases for dynamic prices
                    default:
                        price = staticPrices[o.id.toLowerCase()] || (_.isNil(prices[o.id]) ? 0 : prices[o.id][0]);
                }

                return sum + price * o.balance;
            }, 0.0);

            await StorageService.setItem(WALLET_LIST_KEY, {
                activeWallet,
                wallets,
            });
        }

        return {
            success,
            data: {
                activeWallet: activeWallet,
            },
        };
    } catch (error) {
        return {
            success: false,
            data: error,
        };
    }
}

async function setActiveAsset(asset) {
    try {
        const {activeWallet, wallets} = await StorageService.getItem(
            WALLET_LIST_KEY,
        );
        activeWallet.activeAsset = asset;
        let index = _.findIndex(wallets, {id: activeWallet.id});
        wallets.splice(index, 1, activeWallet);
        await StorageService.setItem(WALLET_LIST_KEY, {
            wallets: wallets,
            activeWallet: activeWallet,
        });
        return {
            success: true,
            data: {wallets: wallets, activeWallet: activeWallet},
        };
    } catch (error) {
        return {
            success: false,
            data: error,
        };
    }
}

async function getActiveAsset(chain) {
    try {
        const {activeWallet, wallets} = await StorageService.getItem(
            WALLET_LIST_KEY,
        );
        activeWallet.activeAsset = _.find(activeWallet.coins, {chain: chain});
        let index = _.findIndex(wallets, {id: activeWallet.id});
        wallets.splice(index, 1, activeWallet);
        await StorageService.setItem(WALLET_LIST_KEY, {
            wallets: wallets,
            activeWallet: activeWallet,
        });
        return {
            success: true,
            data: {wallets: wallets, activeWallet: activeWallet},
        };
    } catch (error) {
        return {
            success: false,
            data: error,
        };
    }
}
async function getActiveWallet() {
    try {
        const {activeWallet} = await StorageService.getItem(WALLET_LIST_KEY);
        if (activeWallet) {
            return {
                success: true,
                data: {activeWallet: activeWallet},
            };
        } else {
            return {
                success: true,
                data: {activeWallet: DEFAULT_WALLET},
            };
        }
    } catch (error) {
        return {
            success: false,
            data: error,
        };
    }
}
