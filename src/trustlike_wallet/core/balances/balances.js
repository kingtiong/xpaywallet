import {ethers} from 'ethers';
import TronWeb from 'tronweb';
import {Connection, PublicKey} from '@solana/web3.js';

import {CHAINS} from '../chains/chains';

export async function getEvmNativeBalance(address, rpcUrl) {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wei = await provider.getBalance(address);
    return ethers.utils.formatEther(wei);
}

export async function getTronNativeBalanceSun(address) {
    const tronWeb = new TronWeb({
        fullHost: CHAINS.tron.fullNode,
    });
    // returns "sun" (1 TRX = 1_000_000 sun)
    return await tronWeb.trx.getBalance(address);
}

export async function getSolanaLamports(address, rpcUrl = CHAINS.solana.rpcUrl) {
    const connection = new Connection(rpcUrl, 'confirmed');
    const pk = new PublicKey(address);
    return await connection.getBalance(pk);
}

export async function getBitcoinSats(address) {
    // Blockstream public API (no key). Replace with your own backend for production.
    const res = await fetch(
        `https://blockstream.info/api/address/${encodeURIComponent(address)}`,
    );
    if (!res.ok) {
        throw new Error(`BTC API error: ${res.status}`);
    }
    const json = await res.json();
    const confirmed = json?.chain_stats?.funded_txo_sum - json?.chain_stats?.spent_txo_sum;
    const mempool = json?.mempool_stats?.funded_txo_sum - json?.mempool_stats?.spent_txo_sum;
    return (confirmed || 0) + (mempool || 0);
}

