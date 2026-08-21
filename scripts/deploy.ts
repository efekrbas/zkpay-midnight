import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledZkPayContract, zkConfigPath } from '../src/generated/index.js';
import { buildProviders, LOCAL_CONFIG } from '../src/utils/providers.js';
import { MidnightWalletProvider, syncWallet } from '../src/utils/wallet.js';
import { randomBytes } from 'node:crypto';
import type { ZKPayPrivateState } from '../src/witnesses.js';
import pino from 'pino';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

async function main() {
  console.log('--- ZKPay Contract Deployment ---');
  console.log('Initializing Midnight Network providers and wallet...');

  const initialPoolValue = 10_000n;
  const ownerSecretKey = new Uint8Array(randomBytes(32));

  try {
    setNetworkId(LOCAL_CONFIG.networkId);
    
    // In a real environment, you'd use a real seed. We'll use a random one for deploy testing.
    const DEPLOYER_SEED = '0000000000000000000000000000000000000000000000000000000000000009';
    
    const wallet = await MidnightWalletProvider.build(logger, {
      walletNetworkId: LOCAL_CONFIG.networkId,
      networkId: LOCAL_CONFIG.networkId,
      indexer: LOCAL_CONFIG.indexer,
      indexerWS: LOCAL_CONFIG.indexerWS,
      node: LOCAL_CONFIG.node,
      nodeWS: LOCAL_CONFIG.nodeWS,
      faucet: LOCAL_CONFIG.faucet,
      proofServer: LOCAL_CONFIG.proofServer,
    }, DEPLOYER_SEED);

    await wallet.start();
    await syncWallet(logger, wallet.wallet, 600_000);
    const providers = buildProviders(wallet, zkConfigPath, LOCAL_CONFIG);

    console.log(`Deploying ZKPay smart contract with initial pool value: ${initialPoolValue}...`);

    const initialPrivateState: ZKPayPrivateState = {
      ownerSecretKey,
    };

    const deployedContract: any = await (deployContract as any)(providers, {
      compiledContract: CompiledZkPayContract,
      privateStateId: 'ZKPayPrivateState',
      initialPrivateState,
      args: [initialPoolValue],
    });

    const contractAddress = deployedContract.deployTxData.public.contractAddress;
    console.log('ZKPay Smart Contract Successfully Deployed!');
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Owner Secret Key (hex): ${Buffer.from(ownerSecretKey).toString('hex')}`);
    
    await wallet.stop();
  } catch (error: any) {
    console.error('Deployment error:', error.message || error);
    process.exit(1);
  }
}

main();
