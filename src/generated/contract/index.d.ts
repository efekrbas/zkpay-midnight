import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type ShieldedPayee = { address: Uint8Array; amount: bigint };

export type CommitmentData = { address: Uint8Array;
                               amount: bigint;
                               secret: Uint8Array
                             };

export type Witnesses<PS> = {
  ownerKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  get_allocated_amount(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  add_payee(context: __compactRuntime.CircuitContext<PS>,
            commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  fund_payroll(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claim_payroll(context: __compactRuntime.CircuitContext<PS>,
                payee_address_0: Uint8Array,
                claim_amount_0: bigint,
                secret_key_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  add_payee(context: __compactRuntime.CircuitContext<PS>,
            commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  fund_payroll(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claim_payroll(context: __compactRuntime.CircuitContext<PS>,
                payee_address_0: Uint8Array,
                claim_amount_0: bigint,
                secret_key_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  add_payee(context: __compactRuntime.CircuitContext<PS>,
            commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  fund_payroll(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claim_payroll(context: __compactRuntime.CircuitContext<PS>,
                payee_address_0: Uint8Array,
                claim_amount_0: bigint,
                secret_key_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly total_pool_value: bigint;
  readonly owner: Uint8Array;
  payees_commitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               initial_pool_value_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
