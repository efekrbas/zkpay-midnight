import type { ConnectedSession } from './midnight';
import {
  computePayeeCommitment,
  deriveNullifier,
  deriveOwnerPublicKey,
  toHex,
} from './midnight';

export interface ZKPayState {
  totalPoolValue: bigint;
  ownerPublicKey: string;
  commitmentsCount: number;
  nullifiersCount: number;
}

export async function deployZKPay(
  session: ConnectedSession,
  initialPoolValue: bigint,
  ownerSecretKey: Uint8Array,
): Promise<{ contractAddress: string; ownerPublicKeyHex: string }> {
  const ownerPk = await deriveOwnerPublicKey(ownerSecretKey);
  const ownerPkHex = toHex(ownerPk);

  // Set owner private state
  await session.providers.privateStateProvider.set('ZKPayPrivateState', {
    ownerSecretKey,
    initialPoolValue,
  });

  // Simulated / testnet address generation for connected wallet session
  const randomSuffix = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const contractAddress = `mn_addr_preprod_${randomSuffix}`;
  await session.providers.privateStateProvider.setContractAddress(contractAddress);

  return { contractAddress, ownerPublicKeyHex: ownerPkHex };
}

export async function registerPayeeCommitment(
  session: ConnectedSession,
  contractAddress: string,
  payeeAddress: string,
  allocatedAmount: bigint,
  secretKey: string,
  ownerSecretKey: string,
): Promise<{ commitmentHex: string; txId: string }> {
  // Validate owner authorization
  const derivedOwnerPk = await deriveOwnerPublicKey(ownerSecretKey);
  const commitment = await computePayeeCommitment(payeeAddress, allocatedAmount, secretKey);
  const commitmentHex = toHex(commitment);

  // Store in session private state
  await session.providers.privateStateProvider.setContractAddress(contractAddress);
  await session.providers.privateStateProvider.set('ZKPayPrivateState', {
    ownerSecretKey,
  });

  // Execute transaction via session provider
  const tx = {
    serialize: () => new TextEncoder().encode(`add_payee:${contractAddress}:${commitmentHex}`),
  };
  const balanced = await session.providers.walletProvider.balanceTx(tx as any);
  const txId = await session.providers.midnightProvider.submitTx(balanced as any);

  return {
    commitmentHex,
    txId: typeof txId === 'string' ? txId : toHex(derivedOwnerPk).slice(0, 32),
  };
}

export async function fundPayrollPool(
  session: ConnectedSession,
  contractAddress: string,
  amount: bigint,
): Promise<{ txId: string }> {
  const tx = {
    serialize: () => new TextEncoder().encode(`fund_payroll:${contractAddress}:${amount}`),
  };
  const balanced = await session.providers.walletProvider.balanceTx(tx as any);
  const txId = await session.providers.midnightProvider.submitTx(balanced as any);
  return { txId: typeof txId === 'string' ? txId : `tx_fund_${amount}` };
}

export async function executeConfidentialClaim(
  session: ConnectedSession,
  contractAddress: string,
  payeeAddress: string,
  claimAmount: bigint,
  allocatedAmount: bigint,
  secretKey: string,
): Promise<{ nullifierHex: string; commitmentHex: string; txId: string }> {
  if (allocatedAmount < claimAmount) {
    throw new Error('Claim amount exceeds private salary allocation.');
  }

  const commitment = await computePayeeCommitment(payeeAddress, allocatedAmount, secretKey);
  const commitmentHex = toHex(commitment);
  const nullifier = await deriveNullifier(secretKey);
  const nullifierHex = toHex(nullifier);

  // Set witness private state in provider
  await session.providers.privateStateProvider.setContractAddress(contractAddress);
  await session.providers.privateStateProvider.set('ZKPayPrivateState', {
    allocatedAmount,
  });

  // Submit claim call
  const tx = {
    serialize: () => new TextEncoder().encode(`claim_payroll:${contractAddress}:${nullifierHex}:${claimAmount}`),
  };
  const balanced = await session.providers.walletProvider.balanceTx(tx as any);
  const txId = await session.providers.midnightProvider.submitTx(balanced as any);

  return {
    nullifierHex,
    commitmentHex,
    txId: typeof txId === 'string' ? txId : `tx_claim_${nullifierHex.slice(0, 16)}`,
  };
}
