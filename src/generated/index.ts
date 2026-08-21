import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { Contract, ledger, pureCircuits } from './contract/index.js';
export { Contract, ledger, pureCircuits };
export type { Ledger, ImpureCircuits, PureCircuits } from './contract/index.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

// In CJS or ESM, we need to locate the assets (keys, zkir) relative to this directory.
let currentDir: string;
if (typeof __dirname !== 'undefined') {
  currentDir = __dirname;
} else {
  // ESM fallback
  currentDir = path.dirname(fileURLToPath(import.meta.url));
}

export const zkConfigPath = path.resolve(currentDir);

export const CompiledZkPayContract = CompiledContract.make(
  'zkpay',
  Contract,
).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);
