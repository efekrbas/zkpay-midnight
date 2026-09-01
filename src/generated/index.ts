import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { Contract, ledger, pureCircuits } from './contract/index.js';
export { Contract, ledger, pureCircuits };
export type { Ledger, ImpureCircuits, PureCircuits } from './contract/index.js';

// Safe resolution for both browser (empty path) and Node (directory)
let currentDir = '';
if (typeof __dirname !== 'undefined') {
  currentDir = __dirname;
}

export const zkConfigPath = currentDir;

export const CompiledZkPayContract = CompiledContract.make(
  'zkpay',
  Contract,
).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

