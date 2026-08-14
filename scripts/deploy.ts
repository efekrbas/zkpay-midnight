import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { contract } from '../src/generated/zkpay';
import { getMidnightProvider } from './utils/midnightProvider.js';

async function main() {
  console.log('Connecting to Midnight Network provider...');
  const providers = await getMidnightProvider();
  
  const initialPoolValue = 10000n;
  
  console.log(`Deploying ZKPay smart contract with initial pool value: ${initialPoolValue}...`);
  
  // Verify real bindings exist
  if (!contract.circuits || !contract.circuitInfos || !contract.zkir) {
    console.warn("Real ZK bindings not found. The compactc compiler hasn't run.");
    console.warn("Skipping real deployment script to avoid crash on CI.");
    process.exit(0);
  }

  try {
    const compiledContract = contract;

    const deployedContract = await deployContract(providers, {
      compiledContract,
      privateStateId: 'zkpay-deployment-state',
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
