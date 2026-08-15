import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { ZKPayPrivateState } from '../witnesses';
import { witnesses } from '../witnesses';
import {
  deriveOwnerPublicKey,
  deriveNullifier,
  computePayeeCommitment,
  toBytes32,
  toHex,
} from '../crypto';

export interface ZKPayLedger {
  total_pool_value: bigint;
  owner: Uint8Array;
  payees_commitments: Map<string, boolean>;
  nullifiers: Map<string, boolean>;
}

export class ZKPayContractState {
  ledger: ZKPayLedger;

  constructor(initialPoolValue: bigint = 0n, ownerPubKey: Uint8Array = new Uint8Array(32)) {
    this.ledger = {
      total_pool_value: initialPoolValue,
      owner: ownerPubKey,
      payees_commitments: new Map<string, boolean>(),
      nullifiers: new Map<string, boolean>(),
    };
  }

  clone(): ZKPayContractState {
    const copy = new ZKPayContractState(this.ledger.total_pool_value, new Uint8Array(this.ledger.owner));
    this.ledger.payees_commitments.forEach((v, k) => copy.ledger.payees_commitments.set(k, v));
    this.ledger.nullifiers.forEach((v, k) => copy.ledger.nullifiers.set(k, v));
    return copy;
  }
}

/**
 * Contract execution logic reflecting the compiled Compact circuit rules
 */
export class ZKPayContract {
  state: ZKPayContractState;

  constructor(initialPoolValue: bigint = 0n, initialOwner?: Uint8Array) {
    this.state = new ZKPayContractState(initialPoolValue, initialOwner || new Uint8Array(32));
  }

  /**
   * Circuit: constructor(initial_pool_value: Uint<64>)
   */
  async constructorCircuit(
    context: WitnessContext<ZKPayPrivateState>,
    initialPoolValue: bigint,
  ): Promise<{ privateState: ZKPayPrivateState; ledger: ZKPayLedger }> {
    const [, ownerSk] = witnesses.ownerKey(context);
    const derivedOwner = deriveOwnerPublicKey(ownerSk);
    this.state.ledger.total_pool_value = initialPoolValue;
    this.state.ledger.owner = derivedOwner;
    return {
      privateState: context.privateState,
      ledger: this.state.ledger,
    };
  }

  /**
   * Circuit: add_payee(commitment: Bytes<32>)
   * Enforces owner authorization: assert(deriveKey(ownerKey()) == owner)
   */
  async add_payee(
    context: WitnessContext<ZKPayPrivateState>,
    commitment: Uint8Array | string,
  ): Promise<{ privateState: ZKPayPrivateState; ledger: ZKPayLedger }> {
    const [, ownerSk] = witnesses.ownerKey(context);
    const callerDerivedOwner = deriveOwnerPublicKey(ownerSk);

    // Assert caller is the authorized contract owner
    if (toHex(callerDerivedOwner) !== toHex(this.state.ledger.owner)) {
      throw new Error('Only owner can register payees');
    }

    const commitmentBytes = toBytes32(commitment);
    const commitmentHex = toHex(commitmentBytes);

    this.state.ledger.payees_commitments.set(commitmentHex, true);

    return {
      privateState: context.privateState,
      ledger: this.state.ledger,
    };
  }

  /**
   * Circuit: fund_payroll(amount: Uint<64>)
   */
  async fund_payroll(
    context: WitnessContext<ZKPayPrivateState>,
    amount: bigint,
  ): Promise<{ privateState: ZKPayPrivateState; ledger: ZKPayLedger }> {
    if (amount <= 0n) {
      throw new Error('Deposit amount must be positive');
    }
    this.state.ledger.total_pool_value += amount;
    return {
      privateState: context.privateState,
      ledger: this.state.ledger,
    };
  }

  /**
   * Circuit: claim_payroll(payee_address, claim_amount, secret_key)
   * Evaluates witness allocated amount, verifies commitment membership, validates nullifier, decrements pool
   */
  async claim_payroll(
    context: WitnessContext<ZKPayPrivateState>,
    payeeAddress: Uint8Array | string,
    claimAmount: bigint,
    secretKey: Uint8Array | string,
  ): Promise<{ privateState: ZKPayPrivateState; ledger: ZKPayLedger }> {
    // 1. Retrieve the allocated amount securely from the local witness
    const [privateState, allocatedAmount] = witnesses.get_allocated_amount(context);

    // 2. Cryptographically assert that allocated balance >= claim_amount
    if (allocatedAmount < claimAmount) {
      throw new Error('Claim exceeds allocated private balance');
    }

    // 3. Recompute commitment and check membership in authorized set
    const payeeBytes = toBytes32(payeeAddress);
    const secretBytes = toBytes32(secretKey);
    const computedCommitment = computePayeeCommitment(payeeBytes, allocatedAmount, secretBytes);
    const commitmentHex = toHex(computedCommitment);

    if (!this.state.ledger.payees_commitments.has(commitmentHex)) {
      throw new Error('Payee commitment not found in authorized set');
    }

    // 4. Assert total pool has sufficient funds
    if (this.state.ledger.total_pool_value < claimAmount) {
      throw new Error('Insufficient total pool value');
    }

    // 5. Check and record nullifier to prevent replay attacks
    const nullifier = deriveNullifier(secretBytes);
    const nullifierHex = toHex(nullifier);

    if (this.state.ledger.nullifiers.has(nullifierHex)) {
      throw new Error('Already claimed');
    }

    this.state.ledger.nullifiers.set(nullifierHex, true);

    // 6. Decrement public total_pool_value
    this.state.ledger.total_pool_value -= claimAmount;

    return {
      privateState,
      ledger: this.state.ledger,
    };
  }
}

/**
 * Singleton export for Midnight.js compatibility
 */
export const contract = {
  contractName: 'zkpay',
  circuits: {
    add_payee: async (context: any, commitment: any) => {
      const c = new ZKPayContract();
      return c.add_payee(context, commitment);
    },
    fund_payroll: async (context: any, amount: any) => {
      const c = new ZKPayContract();
      return c.fund_payroll(context, amount);
    },
    claim_payroll: async (context: any, payeeAddress: any, claimAmount: any, secretKey: any) => {
      const c = new ZKPayContract();
      return c.claim_payroll(context, payeeAddress, claimAmount, secretKey);
    },
  },
  circuitInfos: {
    add_payee: { name: 'add_payee' },
    fund_payroll: { name: 'fund_payroll' },
    claim_payroll: { name: 'claim_payroll' },
  },
  zkir: 'zkpay-compact-zkir',
} as any;
