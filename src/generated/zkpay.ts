/**
 * This is a stub for the generated bindings of the ZKPay Compact contract.
 * It will be overwritten when `npm run compile:compact` is executed.
 */

export const contract = {
  circuits: {
    add_payee: async (..._args: any[]) => {},
    claim_payroll: async (..._args: any[]) => {}
  }
} as any;

export const ledger = {
  total_pool_value: 0n,
  payees_commitments: new Map(),
  nullifiers: new Map()
} as any;
