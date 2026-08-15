import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { contract } from '../src/generated/zkpay';
import { getMidnightProviders } from './utils/midnightProvider';
import { randomBytes } from 'node:crypto';
import type { ZKPayPrivateState } from '../src/witnesses';

async function main() {
  console.log('--- ZKPay Contract Deployment ---');
  console.log('Initializing Midnight Network providers and wallet...');

  const initialPoolValue = 10_000n;
  const ownerSecretKey = new Uint8Array(randomBytes(32));

  try {
    const providers = await getMidnightProviders();

    console.log(`Deploying ZKPay smart contract with initial pool value: ${initialPoolValue}...`);

    const initialPrivateState: ZKPayPrivateState = {
      ownerSecretKey,
    };

    const deployedContract = await deployContract(providers, {
      compiledContract: contract,
      privateStateId: 'ZKPayPrivateState',
      initialPrivateState,
      args: [initialPoolValue],
    });

    const contractAddress = deployedContract.deployTxData.public.contractAddress;
    console.log('ZKPay Smart Contract Successfully Deployed!');
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Owner Secret Key (hex): ${Buffer.from(ownerSecretKey).toString('hex')}`);
  } catch (error: any) {
    console.error('Deployment error:', error.message || error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main };
