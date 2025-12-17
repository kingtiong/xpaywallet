import { Provider } from '@modules/core/provider/base/Provider';
import axios, { AxiosInstance } from 'axios';
import { Logs } from '@modules/log/logs';
import * as web3 from '@solana/web3.js';
import {Buffer} from 'buffer'
import bs58 from "bs58";
import { configProperties } from '@modules/core/config/config.properties';
import _ from 'lodash';
import moment from 'moment';
import {
    clusterApiUrl,
    Connection,
    Message,
    SYSTEM_INSTRUCTION_LAYOUTS,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction
} from "@solana/web3.js";
import {useEffect, useState} from "react";
import * as Token from "@solana/spl-token";
import {ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {ASSET_TYPE_TOKEN} from "@modules/core/constant/constant";

export class SolanaProvider implements Provider {
    apiInstance: AxiosInstance;
    testnet:boolean;
    connection: web3.Connection;

    async getFeeData(payer, recipient): Promise<Object> {
        const recentBlockhash = await this.connection.getLatestBlockhash();
        let type = SYSTEM_INSTRUCTION_LAYOUTS.Transfer;
        let data = Buffer.alloc(type.layout.span);
        const messageParams = {
            accountKeys: [
                payer,
                recipient,
                SystemProgram.programId.toString(),
            ],
            header: {
                numReadonlySignedAccounts: 0,
                numReadonlyUnsignedAccounts: 1,
                numRequiredSignatures: 1,
            },
            instructions: [
                {
                    accounts: [0, 1],
                    data: bs58.encode(data),
                    programIdIndex: 2,
                },
            ],
            recentBlockhash: recentBlockhash.blockhash,
        };

        const message = new Message(messageParams);

        try {
            // const fees = await this.connection.getFeeForMessage(message);
            // console.log(fees)
            return 0
        } catch (error) {
            Logs.error("failed to get fee")
            return 0
        }

    }

    constructor({ apiEndpoint}) {
        this.apiInstance = axios.create({
            baseURL: apiEndpoint = 'https://solana-mainnet.core.chainstack.com/2ef19b6485a2171959b47e653266c846', // Default to Solana mainnet-beta
        });

        console.log(apiEndpoint)

        this.connection = new web3.Connection(
             'https://solana-mainnet.core.chainstack.com/2ef19b6485a2171959b47e653266c846', // Allow cluster override
        );
    }
    async transferToken({signer, tokenContractAddress, to, value}) {}
    async estimateGas(trx): Promise<Object> {
        try {
            let recentBlockhash = this.connection.getLatestBlockhash()
            let type = SYSTEM_INSTRUCTION_LAYOUTS.Transfer;
            let data = Buffer.alloc(type.layout.span);
            const messageParams = {
                accountKeys: [
                    trx.from,
                    trx.to,
                    SystemProgram.programId.toString(),
                ],
                header: {
                    numReadonlySignedAccounts: 0,
                    numReadonlyUnsignedAccounts: 1,
                    numRequiredSignatures: 1,
                },
                instructions: [
                    {
                        accounts: [0, 1],
                        data: bs58.encode(data),
                        programIdIndex: 2,
                    },
                ],
                recentBlockhash: recentBlockhash.blockhash,
            };

            const message = new Message(messageParams);
            const estimatedFee = this.connection.getFeeForMessage(message)

            return {
                success: true,
                estimatedFee: estimatedFee,
            };
        } catch (error) {
            Logs.error('SolanaProvider: estimateGas', error);
            return { success: false, error };
        }
    }
    async getEstimateTokenGas({
                                  signer,
                                  to,
                                  value,
                                  tokenContractAddress,
                                  decimals,
                              }) {}
    async  getTransactions(wallet) {
        try {
            let transactions = [];
            let temp;
            const {data} = await axios.get(
                `https://silent-convincing-valley.solana-mainnet.quiknode.pro/4d43830d7a78708c89c77ee3fe5bb1ec48a5c4d7/transaction?sort=-timestamp&count=true&limit=20&start=0&address=${wallet.walletAddress}`,
            );
            if (wallet.type === ASSET_TYPE_TOKEN) {
                temp = _.filter(data.data, function (tx) {
                    return (
                        tx.contractType === 31 &&
                        tx.contractData.contract_address === wallet.contract
                    );
                });
            } else {
                temp = _.filter(data.data, function (tx) {
                    return tx.contractType === 1;
                });
            }
            for (let i = 0; i < temp.length; i++) {
                const item = {...temp[i]};
                item.to = item.toAddress;
                item.from = item.ownerAddress;
                item.isSender =
                    item.ownerAddress.toUpperCase() ===
                    wallet.walletAddress.toUpperCase();
                item.status = item.result === 'SUCCESS' ? '0' : '-1';
                item.createdAt = moment(item.timestamp / 1000, 'X').fromNow();
                item.value =  item.value / LAMPORTS_PER_SOL;
                item.gasFee = item.fee;
                item.explore =
                    configProperties.solana.explore +
                    `#/transaction/${item.hash}`;
                transactions.push(item);
            }
            return transactions;
        } catch (e) {
            Logs.info('SolanaProvider: getTransactions', e);
            return [];
        }
    }
}

