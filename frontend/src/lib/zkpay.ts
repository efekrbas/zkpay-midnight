import type { ConnectedSession } from './midnight';
import {
  computePayeeCommitment,
  deriveNullifier,
  deriveOwnerPublicKey,
  toHex,
} from './midnight';
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledZkPayContract } from '../../../src/generated/index.js';
import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';

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

  const deployed: any = await (deployContract as any)(session.providers, {
    compiledContract: CompiledZkPayContract,
    privateStateId: 'ZKPayPrivateState',
    initialPrivateState: {
      ownerSecretKey,
    },
    args: [initialPoolValue],
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
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
  const commitment = await computePayeeCommitment(payeeAddress, allocatedAmount, secretKey);
  const commitmentHex = toHex(commitment);

  const tx: any = await (submitCallTx as any)(session.providers, {
    compiledContract: CompiledZkPayContract,
    contractAddress: contractAddress as unknown as ContractAddress,
    privateStateId: 'ZKPayPrivateState',
    initialPrivateState: {
      ownerSecretKey: new Uint8Array(Buffer.from(ownerSecretKey, 'hex')),
    },
    circuitId: 'add_payee',
    args: [commitment],
  });

  return {
    commitmentHex,
    txId: typeof tx.txHash === 'string' ? tx.txHash : tx.txId || 'tx_add_payee',
  };
}

export async function fundPayrollPool(
  session: ConnectedSession,
  contractAddress: string,
  amount: bigint,
): Promise<{ txId: string }> {
  const tx: any = await (submitCallTx as any)(session.providers, {
    compiledContract: CompiledZkPayContract,
    contractAddress: contractAddress as unknown as ContractAddress,
    privateStateId: 'ZKPayPrivateState',
    circuitId: 'fund_payroll',
    args: [amount],
  });

  return { txId: typeof tx.txHash === 'string' ? tx.txHash : tx.txId || 'tx_fund' };
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

  const tx: any = await (submitCallTx as any)(session.providers, {
    compiledContract: CompiledZkPayContract,
    contractAddress: contractAddress as unknown as ContractAddress,
    privateStateId: 'ZKPayPrivateState',
    initialPrivateState: {
      allocatedAmount,
    },
    circuitId: 'claim_payroll',
    args: [payeeAddress, claimAmount, new Uint8Array(Buffer.from(secretKey, 'hex'))],
  });

  return {
    nullifierHex,
    commitmentHex,
    txId: typeof tx.txHash === 'string' ? tx.txHash : tx.txId || 'tx_claim',
  };
}
