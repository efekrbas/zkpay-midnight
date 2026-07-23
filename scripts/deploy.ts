import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { contract, ledger } from '../src/generated/zkpay.js'; // Assuming generated bindings are here
import { getMidnightProvider } from './utils/midnightProvider.js'; 

async function main() {
  console.log('Connecting to Midnight Network provider...');
  const providers = await getMidnightProvider();
  
  const initialPoolValue = 10000n; // 10,000 as a BigInt
  
  console.log(`Deploying ZKPay smart contract with initial pool value: ${initialPoolValue}...`);
  try {
    // deployContract requires providers, the contract circuit/ledger, and initial arguments
    const deployedContract = await deployContract(providers, {
      privateState: {},
      contract: contract,
      initialLedgerState: {
        total_pool_value: initialPoolValue,
        payees_commitments: [] // Initially empty map
      }
    });

    console.log('ZKPay Smart Contract Successfully Deployed!');
    console.log(`Contract Address: ${deployedContract.deployTxData.public.contractAddress}`);
  } catch (error) {
    console.error('Failed to deploy contract:', error);
    process.exit(1);
  }
}

main();
