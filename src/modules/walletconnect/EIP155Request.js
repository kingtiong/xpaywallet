import {getSignParamsMessage, getSignTypedDataParamsData} from './HelperUtils';
import {formatJsonRpcError, formatJsonRpcResult} from '@json-rpc-tools/utils';
import {SignClientTypes} from '@walletconnect/types';
import {getSdkError} from '@walletconnect/utils';
import {EIP155_SIGNING_METHODS} from '@modules/walletconnect/EIP155';

function normalizeChainId(chainId) {
  if (chainId === undefined || chainId === null) {
    return null;
  }

  if (typeof chainId === 'number') {
    return chainId;
  }

  if (chainId.startsWith('0x')) {
    return parseInt(chainId, 16);
  }

  if (/^\d+$/.test(chainId)) {
    return Number(chainId);
  }

  if (chainId.includes(':')) {
    return normalizeChainId(chainId.split(':')[1]);
  }

  return null;
}

function toHexChainId(chainId) {
  const normalized = normalizeChainId(chainId);
  if (normalized === null || Number.isNaN(normalized)) {
    return undefined;
  }
  return `0x${normalized.toString(16)}`;
}

async function resolveWalletAddress(wallet) {
  if (!wallet) {
    return null;
  }

  if (typeof wallet.getAddress === 'function') {
    return wallet.getAddress();
  }

  return wallet.address || null;
}

export async function approveEIP155Request(
  requestEvent,
  wallet,
  context = {},
) {
  const { params, id } = requestEvent;
  const { request } = params;
  const requestedChainId = params?.chainId;
  const hexChainId =
    context.chainIdHex ||
    toHexChainId(requestedChainId || context.chainId || wallet?.provider?.network?.chainId);
  const fallbackHexChainId = hexChainId || '0x1';

  switch (request.method) {
    case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
    case EIP155_SIGNING_METHODS.ETH_SIGN:
      const message = getSignParamsMessage(request.params);
      const signedMessage = await wallet.signMessage(message);
      return formatJsonRpcResult(id, signedMessage);

    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
      const {
        domain,
        types,
        message: data,
      } = getSignTypedDataParamsData(request.params);
      delete types.EIP712Domain;
      const signedData = await wallet._signTypedData(domain, types, data);
      return formatJsonRpcResult(id, signedData);

    case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
      const sendTransaction = request.params[0];
      const { hash } = await wallet.sendTransaction(sendTransaction);
      return formatJsonRpcResult(id, hash);

    case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
      const signTransaction = request.params[0];
      const signature = await wallet.signTransaction(signTransaction);
      return formatJsonRpcResult(id, signature);

    case EIP155_SIGNING_METHODS.ETH_ACCOUNTS:
    case EIP155_SIGNING_METHODS.ETH_REQUEST_ACCOUNTS:
      const account = await resolveWalletAddress(wallet);
      return formatJsonRpcResult(id, account ? [account] : []);

    case EIP155_SIGNING_METHODS.ETH_CHAIN_ID:
      return formatJsonRpcResult(id, fallbackHexChainId);

    case EIP155_SIGNING_METHODS.ETH_BLOCK_NUMBER: {
      const provider = wallet.provider;
      if (!provider?.getBlockNumber) {
        throw new Error(getSdkError('UNSUPPORTED_METHODS').message);
      }
      const blockNumber = await provider.getBlockNumber();
      return formatJsonRpcResult(id, `0x${blockNumber.toString(16)}`);
    }

    case EIP155_SIGNING_METHODS.NET_VERSION: {
      const chainId = normalizeChainId(fallbackHexChainId ?? context.chainId);
      return formatJsonRpcResult(id, chainId?.toString() ?? '0');
    }

    case EIP155_SIGNING_METHODS.WALLET_SWITCH_ETHEREUM_CHAIN:
      return formatJsonRpcResult(id, null);

    case EIP155_SIGNING_METHODS.WALLET_ADD_ETHEREUM_CHAIN:
      return formatJsonRpcResult(id, null);

    default:
      throw new Error(getSdkError("INVALID_METHOD").message);
  }
}

export function rejectEIP155Request(
  request: SignClientTypes.EventArguments["session_request"],
) {
  const { id } = request;

  return formatJsonRpcError(id, getSdkError("USER_REJECTED_METHODS").message);
}
