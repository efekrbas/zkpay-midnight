import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import type { MidnightProviders, WalletProvider, MidnightProvider } from '@midnight-ntwrk/midnight-js-types';
import path from 'node:path';

export interface MidnightConfig {
  networkId: 'preprod' | 'preview' | 'mainnet' | 'undeployed';
  indexerUrl: string;
  indexerWsUrl: string;
  nodeUrl: string;
  proofServerUrl: string;
  zkConfigPath: string;
  privateStateStorePath: string;
  seedHex?: string;
}

export const DEFAULT_CONFIG: MidnightConfig = {
  networkId: (process.env.MIDNIGHT_NETWORK as any) || 'preprod',
  indexerUrl: process.env.INDEXER_URL || 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWsUrl: process.env.INDEXER_WS_URL || 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  nodeUrl: process.env.NODE_URL || 'https://rpc.preprod.midnight.network',
  proofServerUrl: process.env.PROOF_SERVER_URL || 'http://localhost:6300',
  zkConfigPath: process.env.ZK_CONFIG_PATH || path.resolve(process.cwd(), 'src/generated'),
  privateStateStorePath: process.env.PRIVATE_STATE_PATH || 'zkpay_private_state',
  seedHex: process.env.WALLET_SEED,
};

export async function getMidnightProviders(
  config: MidnightConfig = DEFAULT_CONFIG,
): Promise<MidnightProviders<any, any, any>> {
  setNetworkId(config.networkId);

  const zkConfigProvider = new NodeZkConfigProvider(config.zkConfigPath);
  const proofProvider = httpClientProofProvider(config.proofServerUrl, zkConfigProvider);
  const publicDataProvider = indexerPublicDataProvider(config.indexerUrl, config.indexerWsUrl);
  
  const privateStateProvider = levelPrivateStateProvider({
    privateStoragePasswordProvider: async () => 'midnight-secret-storage-password-32bytes',
    accountId: 'zkpay-deployer-account',
    midnightDbName: 'zkpay_midnight_db',
    privateStateStoreName: config.privateStateStorePath,
    signingKeyStoreName: 'zkpay_signing_keys',
  });

  const dummyCoinPublicKey = new Uint8Array(32);

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => dummyCoinPublicKey as any,
    getEncryptionPublicKey: () => dummyCoinPublicKey as any,
    balanceTx: async (tx) => tx as any,
  };

  const midnightProvider: MidnightProvider = {
    submitTx: async (tx: any) => {
      return typeof tx === 'string' ? tx : 'tx_submitted_to_midnight';
    },
  };

  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
}
