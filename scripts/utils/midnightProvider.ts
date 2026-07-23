import { fetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
// import { NodeWalletProvider } from '@midnight-ntwrk/midnight-js-node-wallet-provider';

// Replace these URLs with your actual local Midnight node or testnet endpoints
const INDEXER_URL = process.env.INDEXER_URL || 'http://localhost:8088/api/v1/graphql';
const NODE_URL = process.env.NODE_URL || 'http://localhost:9944';
const PROOF_SERVER_URL = process.env.PROOF_SERVER_URL || 'http://localhost:6300';
const ZK_CONFIG_URL = process.env.ZK_CONFIG_URL || 'http://localhost:8088/api/v1/zkConfig';

/**
 * Initializes and returns the Midnight network providers required for contract deployment and interaction.
 */
export async function getMidnightProvider() {
  console.log('Initializing Midnight Providers...');
  console.log(`- Node URL: ${NODE_URL}`);
  console.log(`- Indexer URL: ${INDEXER_URL}`);
  console.log(`- Proof Server URL: ${PROOF_SERVER_URL}`);

  // 1. Public Data Provider (RPC / Indexer)
  const publicDataProvider = indexerPublicDataProvider(INDEXER_URL, NODE_URL);

  // 2. ZK Config Provider (Fetches verification keys and circuit parameters)
  const zkConfigProvider = fetchZkConfigProvider(ZK_CONFIG_URL);

  // 3. Proof Provider (Handles remote proof generation if not doing it locally)
  const proofProvider = httpClientProofProvider(PROOF_SERVER_URL);

  // 4. Wallet Provider (For Node.js deployment, requires a seed or key)
  // const seed = process.env.DEPLOYER_SEED || '0000000000000000000000000000000000000000000000000000000000000000';
  // const walletProvider = await NodeWalletProvider.fromSeed(seed, publicDataProvider);
  const walletProvider = {} as any; // Mocked for safety unless seed is provided

  return {
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
  };
}
