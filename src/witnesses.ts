import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export type ZKPayPrivateState = {
  ownerSecretKey?: Uint8Array;
  allocatedAmount?: bigint;
};

export const witnesses = {
  ownerKey: (context: WitnessContext<ZKPayPrivateState>): readonly [ZKPayPrivateState, Uint8Array] => {
    const key = context.privateState.ownerSecretKey ?? new Uint8Array(32);
    return [context.privateState, key] as const;
  },
  get_allocated_amount: (context: WitnessContext<ZKPayPrivateState>): readonly [ZKPayPrivateState, bigint] => {
    const amount = context.privateState.allocatedAmount ?? 0n;
    return [context.privateState, amount] as const;
  },
};
