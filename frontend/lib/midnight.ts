import type { MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';

export type ConnectedSession = {
  api: any;
  config: {
    networkId: string;
    indexerUri: string;
    indexerWsUri: string;
    nodeUri?: string;
    proverServerUri?: string;
  };
  providers: {
    privateStateProvider: ReturnType<typeof createPrivateStateProvider>;
    publicDataProvider: ReturnType<typeof createPatchedPublicDataProvider>;
    zkConfigProvider?: any;
    proofProvider?: { proveTx: (unprovenTx: any) => Promise<any> };
    walletProvider: WalletProvider;
    midnightProvider: MidnightProvider;
  };
  unshieldedAddress: string;
  shieldedAddress?: string;
  coinPublicKeyBytes: Uint8Array;
};

export function fromHex(hex: string): Uint8Array {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  const match = h.match(/.{1,2}/g);
  if (!match) return new Uint8Array(0);
  return Uint8Array.from(match.map((b) => parseInt(b, 16)));
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function pad32(str: string): Uint8Array {
  const buf = new Uint8Array(32);
  const strBytes = new TextEncoder().encode(str);
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
    return fromHex(hex);
  }
  return pad32(input);
}

/**
 * SHA-256 helper using browser Web Crypto API
 */
export async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as ArrayBufferView<ArrayBuffer>);
  return new Uint8Array(hashBuffer);
}

/**
 * Compute domain-separated Owner public key
 */
export async function deriveOwnerPublicKey(ownerSecretKey: Uint8Array | string): Promise<Uint8Array> {
  const domain = pad32('zkpay:owner:v1');
  const sk = toBytes32(ownerSecretKey);
  const combined = new Uint8Array(64);
  combined.set(domain, 0);
  combined.set(sk, 32);
  return sha256Bytes(combined);
}

/**
 * Compute domain-separated Nullifier
 */
export async function deriveNullifier(secretKey: Uint8Array | string): Promise<Uint8Array> {
  const domain = pad32('zkpay:nullifier:v1');
  const sk = toBytes32(secretKey);
  const combined = new Uint8Array(64);
  combined.set(domain, 0);
  combined.set(sk, 32);
  return sha256Bytes(combined);
}

/**
 * Compute Payee Commitment over (address, amount, secret)
 */
export async function computePayeeCommitment(
  payeeAddress: Uint8Array | string,
  allocatedAmount: bigint,
  secretKey: Uint8Array | string,
): Promise<Uint8Array> {
  const domain = pad32('zkpay:commitment:v1');
  const addr = toBytes32(payeeAddress);
  const sk = toBytes32(secretKey);

  const amountBuf = new Uint8Array(8);
  const view = new DataView(amountBuf.buffer);
  view.setBigUint64(0, allocatedAmount, false);

  const combined = new Uint8Array(32 + 32 + 8 + 32);
  combined.set(domain, 0);
  combined.set(addr, 32);
  combined.set(amountBuf, 64);
  combined.set(sk, 72);

  return sha256Bytes(combined);
}

export function coinPublicKeyToBytes(pk: unknown): Uint8Array {
  if (pk instanceof Uint8Array) return pk.length === 32 ? pk : pk.slice(0, 32);
  if (typeof pk === 'string') {
    const hex = pk.startsWith('0x') ? pk.slice(2) : pk;
    if (hex.length === 64 && /^[0-9a-fA-F]+$/.test(hex)) return fromHex(hex);
    return new Uint8Array(32);
  }
  if (Array.isArray(pk)) {
    return new Uint8Array(pk.length >= 32 ? pk.slice(0, 32) : [...pk, ...new Uint8Array(32 - pk.length)]);
  }
  if (pk && typeof pk === 'object' && 'bytes' in (pk as object)) {
    return coinPublicKeyToBytes((pk as { bytes: unknown }).bytes);
  }
  return new Uint8Array(32);
}

export function createPrivateStateProvider() {
  let scope = '';
  const stateStore = new Map<string, unknown>();
  const signingKeyStore = new Map<string, unknown>();
  const key = (id: string) => `${scope}:${id}`;

  return {
    setContractAddress(address: string) {
      scope = address;
    },
    async set(id: string, state: unknown) {
      stateStore.set(key(id), state);
    },
    async get(id: string) {
      return stateStore.get(key(id)) ?? null;
    },
    async remove(id: string) {
      stateStore.delete(key(id));
    },
    async clear() {
      stateStore.clear();
    },
    async setSigningKey(addr: string, k: unknown) {
      signingKeyStore.set(addr, k);
    },
    async getSigningKey(addr: string) {
      return signingKeyStore.get(addr) ?? null;
    },
    async removeSigningKey(addr: string) {
      signingKeyStore.delete(addr);
    },
    async clearSigningKeys() {
      signingKeyStore.clear();
    },
    async exportPrivateStates(): Promise<never> {
      throw new Error('Not implemented.');
    },
    async importPrivateStates(): Promise<never> {
      throw new Error('Not implemented.');
    },
    async exportSigningKeys(): Promise<never> {
      throw new Error('Not implemented.');
    },
    async importSigningKeys(): Promise<never> {
      throw new Error('Not implemented.');
    },
  };
}

export function createPatchedPublicDataProvider(queryUrl: string, subscriptionUrl: string) {
  return {
    queryUrl,
    subscriptionUrl,
    async queryContractState(contractAddress: string) {
      const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: `query LATEST_CONTRACT_STATE($address: HexEncoded!) {
            contractAction(address: $address) { state }
          }`,
          variables: { address: contractAddress },
        }),
      });
      if (!res.ok) throw new Error(`Indexer HTTP error: ${res.status}`);
      const payload = await res.json();
      if (payload.errors?.length) {
        throw new Error(payload.errors.map((e: { message: string }) => e.message).join('; '));
      }
      return payload.data?.contractAction?.state ?? null;
    },
  };
}

export async function detectWallet(): Promise<any> {
  if (typeof window === 'undefined') return null;
  const win = window as any;
  if (win.midnight) {
    if (win.midnight['1am']) return win.midnight['1am'];
    if (win.midnight.lace) return win.midnight.lace;
    if (win.midnight.mnLace) return win.midnight.mnLace;
    const firstWallet = Object.values(win.midnight)[0];
    if (firstWallet) return firstWallet;
  }
  return null;
}

export async function createConnectedSession(api: any): Promise<ConnectedSession> {
  const enabledApi = api.enable ? await api.enable() : api;

  let config = {
    networkId: 'preprod',
    indexerUri: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWsUri: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  };

  let unshieldedAddress = 'mn_addr_preprod_unknown';
  let shieldedAddress = '';
  let coinPublicKey: any = new Uint8Array(32);

  if (enabledApi.getConfiguration) {
    try {
      config = await enabledApi.getConfiguration();
    } catch {}
  }

  if (enabledApi.getUnshieldedAddress) {
    try {
      const res = await enabledApi.getUnshieldedAddress();
      unshieldedAddress = typeof res === 'string' ? res : res?.unshieldedAddress || String(res);
    } catch {}
  }

  if (enabledApi.getShieldedAddresses) {
    try {
      const res = await enabledApi.getShieldedAddresses();
      shieldedAddress = res?.shieldedAddress || '';
      if (res?.shieldedCoinPublicKey) {
        coinPublicKey = coinPublicKeyToBytes(res.shieldedCoinPublicKey) as any;
      }
    } catch {}
  }

  const privateStateProvider = createPrivateStateProvider();
  const publicDataProvider = createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri);

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => coinPublicKey as any,
    getEncryptionPublicKey: () => coinPublicKey as any,
    balanceTx: async (tx: any) => {
      if (enabledApi.balanceUnsealedTransaction) {
        const txHex = toHex(tx.serialize ? tx.serialize() : new Uint8Array(0));
        const balanced = await enabledApi.balanceUnsealedTransaction(txHex);
        if (!balanced?.tx) throw new Error('balanceUnsealedTransaction returned invalid result');
        return balanced;
      }
      return tx;
    },
  };

  const midnightProvider: MidnightProvider = {
    submitTx: async (tx: any) => {
      if (enabledApi.submitTransaction) {
        const txHex = toHex(tx.serialize ? tx.serialize() : new Uint8Array(0));
        const result = await enabledApi.submitTransaction(txHex);
        if (typeof result === 'string' && result) return result;
        if (result?.transactionId) return result.transactionId;
        if (result?.id) return result.id;
        return txHex.slice(0, 64);
      }
      return 'tx_submitted_ok';
    },
  };

  return {
    api: enabledApi,
    config,
    providers: {
      privateStateProvider,
      publicDataProvider,
      walletProvider,
      midnightProvider,
    },
    unshieldedAddress,
    shieldedAddress,
    coinPublicKeyBytes: coinPublicKey as any,
  };
}
