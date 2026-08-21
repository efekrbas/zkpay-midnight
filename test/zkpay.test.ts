import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';
import pino from 'pino';
import { randomBytes } from 'node:crypto';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';

import {
  CompiledZkPayContract,
  ledger,
  zkConfigPath,
} from '../src/generated/index.js';
import { LOCAL_CONFIG, buildProviders, type ZKPayProviders } from '../src/utils/providers.js';
import { MidnightWalletProvider, syncWallet } from '../src/utils/wallet.js';
import { computePayeeCommitment, toHex, pad32 } from '../src/crypto.js';

// Required for GraphQL subscriptions in Node.js
// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

const ALICE_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const BOB_SEED   = '0000000000000000000000000000000000000000000000000000000000000002';
const CAROL_SEED = '0000000000000000000000000000000000000000000000000000000000000003';

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

describe('ZKPay Confidential Payroll Protocol', () => {
  let ownerWallet: MidnightWalletProvider;
  let ownerProviders: ZKPayProviders;
  let employeeWallet: MidnightWalletProvider;
  let employeeProviders: ZKPayProviders;
  let contractAddress: ContractAddress;

  const INITIAL_POOL = 10_000n;
  const SALARY_ALLOCATION = 1_500n;
  const CLAIM_AMOUNT = 500n;

  const employeeAddress = pad32('0xEmployee');
  const employeeSecret = new Uint8Array(randomBytes(32));
  const ownerSecret = new Uint8Array(randomBytes(32));

  async function queryLedger(providers: ZKPayProviders) {
    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    expect(state).not.toBeNull();
    return ledger(state!.data);
  }

  beforeAll(async () => {
    setNetworkId(LOCAL_CONFIG.networkId);
    const envConfig: EnvironmentConfiguration = {
      walletNetworkId: LOCAL_CONFIG.networkId,
      networkId: LOCAL_CONFIG.networkId,
      indexer: LOCAL_CONFIG.indexer,
      indexerWS: LOCAL_CONFIG.indexerWS,
      node: LOCAL_CONFIG.node,
      nodeWS: LOCAL_CONFIG.nodeWS,
      faucet: LOCAL_CONFIG.faucet,
      proofServer: LOCAL_CONFIG.proofServer,
    };

    ownerWallet = await MidnightWalletProvider.build(logger, envConfig, ALICE_SEED);
    await ownerWallet.start();
    await syncWallet(logger, ownerWallet.wallet, 600_000);
    ownerProviders = buildProviders(ownerWallet, zkConfigPath, LOCAL_CONFIG);

    employeeWallet = await MidnightWalletProvider.build(logger, envConfig, BOB_SEED);
    await employeeWallet.start();
    await syncWallet(logger, employeeWallet.wallet, 600_000);
    employeeProviders = buildProviders(employeeWallet, zkConfigPath, LOCAL_CONFIG);

    logger.info('Wallets and providers initialized.');
  });

  afterAll(async () => {
    await ownerWallet?.stop();
    await employeeWallet?.stop();
  });

  it('1. Initializes the contract and sets the public total pool value', async () => {
    const deployed: any = await (deployContract as any)(ownerProviders, {
      compiledContract: CompiledZkPayContract,
      privateStateId: 'zkpay-owner-state',
      initialPrivateState: {
        ownerSecretKey: ownerSecret,
      },
      args: [INITIAL_POOL],
    });

    contractAddress = deployed.deployTxData.public.contractAddress;
    expect(contractAddress).toBeDefined();

    const state = await queryLedger(ownerProviders);
    expect(state.total_pool_value).toEqual(INITIAL_POOL);
  });

  it('2. Enforces Owner Authorization & Payee Commitment Registration', async () => {
    const commitment = computePayeeCommitment(employeeAddress, SALARY_ALLOCATION, employeeSecret);

    // Should succeed for the authorized owner
    await (submitCallTx as any)(ownerProviders, {
      compiledContract: CompiledZkPayContract,
      contractAddress,
      privateStateId: 'zkpay-owner-state',
      circuitId: 'add_payee',
      args: [commitment],
    });

    const state = await queryLedger(ownerProviders);
    expect(state.payees_commitments.size).toBeGreaterThan(0);

    // Should fail for unauthorized user (employee trying to add a payee)
    let errorMsg = '';
    try {
      await (submitCallTx as any)(employeeProviders, {
        compiledContract: CompiledZkPayContract,
        contractAddress,
        privateStateId: 'zkpay-emp-state',
        circuitId: 'add_payee',
        args: [commitment],
      });
    } catch (err: any) {
      errorMsg = err.message;
    }
    expect(errorMsg).toContain('Only owner can register payees');
  });

  it('3. Funds the Payroll Pool', async () => {
    const depositAmount = 5_000n;
    await (submitCallTx as any)(ownerProviders, {
      compiledContract: CompiledZkPayContract,
      contractAddress,
      privateStateId: 'zkpay-owner-state',
      circuitId: 'fund_payroll',
      args: [depositAmount],
    });

    const state = await queryLedger(ownerProviders);
    expect(state.total_pool_value).toEqual(INITIAL_POOL + depositAmount);
  });

  it('4. Confidential Payroll Claims', async () => {
    // 4.1. Claim successfully
    await (submitCallTx as any)(employeeProviders, {
      compiledContract: CompiledZkPayContract,
      contractAddress,
      privateStateId: 'zkpay-emp-state',
      initialPrivateState: {
        allocatedAmount: SALARY_ALLOCATION,
      },
      circuitId: 'claim_payroll',
      args: [employeeAddress, CLAIM_AMOUNT, employeeSecret],
    });

    let state = await queryLedger(employeeProviders);
    expect(state.total_pool_value).toEqual(INITIAL_POOL + 5_000n - CLAIM_AMOUNT);
    expect(state.nullifiers.size).toBeGreaterThan(0);

    // 4.2. Prevent double spending
    let errorMsg = '';
    try {
      await (submitCallTx as any)(employeeProviders, {
        compiledContract: CompiledZkPayContract,
        contractAddress,
        privateStateId: 'zkpay-emp-state',
        initialPrivateState: {
          allocatedAmount: SALARY_ALLOCATION,
        },
        circuitId: 'claim_payroll',
        args: [employeeAddress, CLAIM_AMOUNT, employeeSecret],
      });
    } catch (err: any) {
      errorMsg = err.message;
    }
    expect(errorMsg).toContain('Already claimed');

    // 4.3. Reject claim exceeding private balance
    const fakeSecret = new Uint8Array(randomBytes(32));
    const fakeCommitment = computePayeeCommitment(employeeAddress, SALARY_ALLOCATION, fakeSecret);
    await (submitCallTx as any)(ownerProviders, {
      compiledContract: CompiledZkPayContract,
      contractAddress,
      privateStateId: 'zkpay-owner-state',
      circuitId: 'add_payee',
      args: [fakeCommitment],
    });

    try {
      await (submitCallTx as any)(employeeProviders, {
        compiledContract: CompiledZkPayContract,
        contractAddress,
        privateStateId: 'zkpay-emp-state',
        initialPrivateState: {
          allocatedAmount: SALARY_ALLOCATION,
        },
        circuitId: 'claim_payroll',
        args: [employeeAddress, SALARY_ALLOCATION + 1n, fakeSecret],
      });
    } catch (err: any) {
      errorMsg = err.message;
    }
    expect(errorMsg).toContain('Claim exceeds allocated private balance');
  });
});
