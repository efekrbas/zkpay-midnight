import { expect } from 'chai';
import { randomBytes } from 'node:crypto';
import {
  ZKPayContract,
  ZKPayPrivateState,
  computePayeeCommitment,
  deriveOwnerPublicKey,
  deriveNullifier,
  pad32,
  toHex,
} from '../src';

describe('ZKPay Confidential Payroll & Splits Protocol - Core Circuit & Privacy Tests', () => {
  const INITIAL_POOL = 10_000n;
  const SALARY_ALLOCATION_ALICE = 1_500n;
  const CLAIM_AMOUNT_ALICE = 500n;

  const aliceAddress = pad32('0xAlicePayeeAddress');
  const aliceSecret = new Uint8Array(randomBytes(32));

  const bobAddress = pad32('0xBobPayeeAddress');
  const bobSecret = new Uint8Array(randomBytes(32));
  const SALARY_ALLOCATION_BOB = 2_000n;

  const ownerSecretKey = new Uint8Array(randomBytes(32));
  const attackerSecretKey = new Uint8Array(randomBytes(32));

  let contract: ZKPayContract;

  beforeEach(async () => {
    contract = new ZKPayContract();
    const ownerContext = {
      privateState: {
        ownerSecretKey,
      } as ZKPayPrivateState,
      contractAddress: '0xZKPayContractAddress',
    };

    await contract.constructorCircuit(ownerContext as any, INITIAL_POOL);
  });

  describe('1. Initialization & Ledger State', () => {
    it('should properly initialize the public total_pool_value', () => {
      expect(contract.state.ledger.total_pool_value).to.equal(INITIAL_POOL);
    });

    it('should derive and store the authenticated owner public key', () => {
      const expectedOwnerPk = deriveOwnerPublicKey(ownerSecretKey);
      expect(toHex(contract.state.ledger.owner)).to.equal(toHex(expectedOwnerPk));
    });
  });

  describe('2. Owner Authorization & Payee Commitment Registration', () => {
    it('should allow the authorized contract owner to register a valid payee commitment', async () => {
      const aliceCommitment = computePayeeCommitment(aliceAddress, SALARY_ALLOCATION_ALICE, aliceSecret);
      const ownerContext = {
        privateState: { ownerSecretKey } as ZKPayPrivateState,
        contractAddress: '0xZKPayContractAddress',
      };

      await contract.add_payee(ownerContext as any, aliceCommitment);

      const commitmentHex = toHex(aliceCommitment);
      expect(contract.state.ledger.payees_commitments.has(commitmentHex)).to.be.true;
    });

    it('should strictly reject unauthenticated strangers attempting to register commitments', async () => {
      const attackerCommitment = computePayeeCommitment(pad32('0xAttacker'), 9_999n, new Uint8Array(32));
      const attackerContext = {
        privateState: { ownerSecretKey: attackerSecretKey } as ZKPayPrivateState,
        contractAddress: '0xZKPayContractAddress',
      };

      let errorMsg = '';
      try {
        await contract.add_payee(attackerContext as any, attackerCommitment);
      } catch (err: any) {
        errorMsg = err.message;
      }

      expect(errorMsg).to.equal('Only owner can register payees');
      expect(contract.state.ledger.payees_commitments.has(toHex(attackerCommitment))).to.be.false;
    });
  });

  describe('3. Funding the Payroll Pool', () => {
    it('should allow depositing funds to increment total_pool_value', async () => {
      const context = { privateState: {} as ZKPayPrivateState, contractAddress: '0xZKPayContractAddress' };
      const depositAmount = 5_000n;

      await contract.fund_payroll(context as any, depositAmount);
      expect(contract.state.ledger.total_pool_value).to.equal(INITIAL_POOL + depositAmount);
    });

    it('should reject non-positive deposit amounts', async () => {
      const context = { privateState: {} as ZKPayPrivateState, contractAddress: '0xZKPayContractAddress' };
      let errorMsg = '';
      try {
        await contract.fund_payroll(context as any, 0n);
      } catch (err: any) {
        errorMsg = err.message;
      }
      expect(errorMsg).to.equal('Deposit amount must be positive');
    });
  });

  describe('4. Confidential Payroll Claims (ZK Witness & Circuits)', () => {
    beforeEach(async () => {
      // Owner registers Alice and Bob
      const ownerContext = {
        privateState: { ownerSecretKey } as ZKPayPrivateState,
        contractAddress: '0xZKPayContractAddress',
      };
      const aliceCommitment = computePayeeCommitment(aliceAddress, SALARY_ALLOCATION_ALICE, aliceSecret);
      const bobCommitment = computePayeeCommitment(bobAddress, SALARY_ALLOCATION_BOB, bobSecret);

      await contract.add_payee(ownerContext as any, aliceCommitment);
      await contract.add_payee(ownerContext as any, bobCommitment);
    });

    it('should successfully process a valid claim, decrement pool balance, and record nullifier', async () => {
      const aliceContext = {
        privateState: {
          allocatedAmount: SALARY_ALLOCATION_ALICE,
        } as ZKPayPrivateState,
        contractAddress: '0xZKPayContractAddress',
      };

      const result = await contract.claim_payroll(
        aliceContext as any,
        aliceAddress,
        CLAIM_AMOUNT_ALICE,
        aliceSecret,
      );

      // Verify pool decremented
      expect(result.ledger.total_pool_value).to.equal(INITIAL_POOL - CLAIM_AMOUNT_ALICE);

      // Verify nullifier is recorded
      const expectedNullifier = deriveNullifier(aliceSecret);
      expect(result.ledger.nullifiers.has(toHex(expectedNullifier))).to.be.true;
    });

    it('should prevent double-spending by rejecting duplicate claims with the same secret (Nullifier Check)', async () => {
      const aliceContext = {
        privateState: {
          allocatedAmount: SALARY_ALLOCATION_ALICE,
        } as ZKPayPrivateState,
        contractAddress: '0xZKPayContractAddress',
      };

      // First claim succeeds
      await contract.claim_payroll(aliceContext as any, aliceAddress, CLAIM_AMOUNT_ALICE, aliceSecret);

      // Second claim attempt with the same secret must fail
      let errorMsg = '';
      try {
        await contract.claim_payroll(aliceContext as any, aliceAddress, CLAIM_AMOUNT_ALICE, aliceSecret);
      } catch (err: any) {
        errorMsg = err.message;
      }

      expect(errorMsg).to.equal('Already claimed');
    });

    it('should reject a claim when the claimed amount exceeds the private allocated balance', async () => {
      const overClaimAmount = SALARY_ALLOCATION_ALICE + 500n;
      const aliceContext = {
        privateState: {
          allocatedAmount: SALARY_ALLOCATION_ALICE,
        } as ZKPayPrivateState,
        contractAddress: '0xZKPayContractAddress',
      };

      let errorMsg = '';
      try {
        await contract.claim_payroll(aliceContext as any, aliceAddress, overClaimAmount, aliceSecret);
      } catch (err: any) {
        errorMsg = err.message;
      }

      expect(errorMsg).to.equal('Claim exceeds allocated private balance');
    });

    it('should reject a claim when an unauthorized party supplies an unregistered secret', async () => {
      const fakeSecret = new Uint8Array(randomBytes(32));
      const context = {
        privateState: {
          allocatedAmount: 1_000n,
        } as ZKPayPrivateState,
        contractAddress: '0xZKPayContractAddress',
      };

      let errorMsg = '';
      try {
        await contract.claim_payroll(context as any, aliceAddress, 500n, fakeSecret);
      } catch (err: any) {
        errorMsg = err.message;
      }

      expect(errorMsg).to.equal('Payee commitment not found in authorized set');
    });
  });
});
