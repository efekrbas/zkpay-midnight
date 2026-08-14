import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { contract, ledger } from '../src/generated/zkpay.js';
import { getMidnightProvider } from './utils/midnightProvider.js';

async function main() {
  console.log('Connecting to Midnight Network provider...');
  const providers = await getMidnightProvider();
  
  const initialPoolValue = 10000n; // 10,000 as a BigInt
  
  console.log(`Deploying ZKPay smart contract with initial pool value: ${initialPoolValue}...`);
  try {
    const deployedContract = await deployContract(providers, {
      privateStateProvider: providers.privateStateProvider,
      zkConfigProvider: providers.zkConfigProvider,
      publicDataProvider: providers.publicDataProvider,
      proofProvider: providers.proofProvider,
      walletProvider: providers.walletProvider,
      midnightProvider: providers.midnightProvider,
    }, {
      privateStateId: 'zkpay-deployment-state',
      contract: contract,
      initialPrivateState: {},
      args: [initialPoolValue],
    });

    console.log('ZKPay Smart Contract Successfully Deployed!');
    console.log(`Contract Address: ${deployedContract.deployTxData.public.contractAddress}`);
  } catch (error) {
    console.error('Failed to deploy contract:', error);
    process.exit(1);
  }
}

main();
