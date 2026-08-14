import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';

// Simulated provider construction for the deploy script.
// In a real environment, you'd use @midnight-ntwrk/testkit-js FluentWalletBuilder here.
export async function getMidnightProvider(): Promise<any> {
  console.log('Initializing Midnight Providers...');
  
  const INDEXER_URL = process.env.INDEXER_URL || 'http://localhost:8088/api/v1/graphql';
  const NODE_URL = process.env.NODE_URL || 'http://localhost:9944';
  const PROOF_SERVER_URL = process.env.PROOF_SERVER_URL || 'http://localhost:6300';
  
  return {
    publicDataProvider: indexerPublicDataProvider(INDEXER_URL, NODE_URL),
    proofProvider: httpClientProofProvider(PROOF_SERVER_URL),
    zkConfigProvider: new NodeZkConfigProvider('managed/zkpay'),
    // Mocking wallet provider and private state to pass TypeScript typing for the stub
    walletProvider: {} as any,
    midnightProvider: {} as any,
    privateStateProvider: {} as any
  };
}
