import { createHash } from 'node:crypto';

export function pad32(str: string): Uint8Array {
  const buf = new Uint8Array(32);
  const strBytes = Buffer.from(str, 'utf-8');
  buf.set(strBytes.subarray(0, 32));
  return buf;
}

export function toBytes32(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) {
    if (input.length === 32) return input;
    const res = new Uint8Array(32);
    res.set(input.subarray(0, 32));
    return res;
  }
  const hex = input.startsWith('0x') ? input.slice(2) : input;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    return Uint8Array.from(Buffer.from(hex, 'hex'));
  }
  return pad32(input);
}

export function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

export function fromHex(hex: string): Uint8Array {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Uint8Array.from(Buffer.from(h, 'hex'));
}

/**
 * Domain-separated persistentHash for Owner Key derivation
 * Matches: persistentHash<Vector<2, Bytes<32>>>([pad(32, "zkpay:owner:v1"), sk])
 */
export function deriveOwnerPublicKey(ownerSecretKey: Uint8Array | string): Uint8Array {
  const domain = pad32('zkpay:owner:v1');
  const sk = toBytes32(ownerSecretKey);
  const hasher = createHash('sha256');
  hasher.update(domain);
  hasher.update(sk);
  return new Uint8Array(hasher.digest());
}

/**
 * Domain-separated persistentHash for Nullifier derivation
 * Matches: persistentHash<Vector<2, Bytes<32>>>([pad(32, "zkpay:nullifier:v1"), sk])
 */
export function deriveNullifier(secretKey: Uint8Array | string): Uint8Array {
  const domain = pad32('zkpay:nullifier:v1');
  const sk = toBytes32(secretKey);
  const hasher = createHash('sha256');
  hasher.update(domain);
  hasher.update(sk);
  return new Uint8Array(hasher.digest());
}

/**
 * Structured persistentHash for Payee Commitment
 * Matches: persistentHash<CommitmentData>(CommitmentData { address, amount, secret })
 */
export function computePayeeCommitment(
  payeeAddress: Uint8Array | string,
  allocatedAmount: bigint,
  secretKey: Uint8Array | string,
): Uint8Array {
  const domain = pad32('zkpay:commitment:v1');
  const addr = toBytes32(payeeAddress);
  const sk = toBytes32(secretKey);
  
  // 64-bit big-endian amount buffer
  const amountBuf = new Uint8Array(8);
  const view = new DataView(amountBuf.buffer);
  view.setBigUint64(0, allocatedAmount, false);

  const hasher = createHash('sha256');
  hasher.update(domain);
  hasher.update(addr);
  hasher.update(amountBuf);
  hasher.update(sk);
  return new Uint8Array(hasher.digest());
}
