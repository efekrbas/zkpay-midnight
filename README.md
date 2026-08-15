# ZKPay: Confidential Payroll & Splits Protocol

ZKPay is a privacy-preserving decentralized application built on the **Midnight Network** using the **Compact** smart contract language and **Midnight.js** TypeScript SDK. It enables organizations to manage payroll, fund liquidity, and disburse salaries without exposing employee identities, individual salary allocations, or payee addresses to the public ledger.

---

## 🛡️ Privacy & Cryptographic Model

ZKPay utilizes Zero-Knowledge proofs and Midnight's dual-state model (public ledger + private witness state) to balance organizational transparency with cryptographic employee privacy.

### What is Public on the Ledger (`export ledger`):
- **Total Pool Liquidity (`total_pool_value`)**: Observers can verifiably inspect the total liquidity funded into the contract.
- **Contract Owner Public Key (`owner`)**: Derived from the deployer's secret key via `deriveKey(ownerKey())`.
- **Authorized Commitments (`payees_commitments`)**: Cryptographic commitments of registered payees. Observers see only 32-byte hashes, not the constituent addresses, amounts, or secrets.
- **Spent Nullifiers (`nullifiers`)**: Domain-separated nullifier hashes recorded upon claim to prevent replay attacks and double-spending.
- **ZK Proof Verification**: Observers and network validators verify that each claim satisfies all circuit constraints.

### What Remains Strictly Private (`witness`):
- **Payee Identity**: The claimant's address is verified inside the zero-knowledge circuit and never disclosed publicly.
- **Allocated Salary**: The employee's exact private allocation is provided off-chain via the local witness (`get_allocated_amount()`).
- **Secret Entropy Key**: A private secret shared between employer and employee to construct the commitment preimage.
- **Commitment Pre-image**: Observers cannot brute-force or reverse commitments without knowing the 3-tuple `(address, allocated_amount, secret_key)`.

---

## 🔒 Secure Authorization Architecture

To eliminate unauthorized fund drainage and ensure strict integrity:

1. **Owner-Gated Payee Registration (`add_payee`)**:
   - Only the contract owner who holds the deployer's `ownerKey` can register new payee commitments into `payees_commitments`.
   - Enforced cryptographically by: `assert(deriveKey(ownerKey()) == owner, "Only owner can register payees");`
2. **Entitlement & Allocation Bounds Check (`claim_payroll`)**:
   - The circuit fetches `allocated_amount` from the local witness and asserts `allocated_amount >= claim_amount`.
   - The circuit computes `computeCommitment(payee_address, allocated_amount, secret_key)` and asserts membership in `payees_commitments`.
3. **Double-Spending Prevention (Nullifier System)**:
   - A unique nullifier is derived using domain separation: `deriveNullifier(secret_key)`.
   - The circuit asserts `!nullifiers.member(nullifier)` before inserting the nullifier into ledger state.
4. **Liquidity Balance Decrement**:
   - The circuit verifies `total_pool_value >= claim_amount` and decrements the pool upon proof verification.

---

## 📜 Smart Contract Architecture

The core logic is implemented in Compact at `smart-contracts/zkpay.compact`:

```compact
pragma language_version >= 0.20;

import CompactStandardLibrary;

export struct CommitmentData {
    address: Bytes<32>,
    amount: Uint<64>,
    secret: Bytes<32>
}

export ledger total_pool_value: Uint<64>;
export ledger owner: Bytes<32>;
export ledger payees_commitments: Map<Bytes<32>, Boolean>;
export ledger nullifiers: Map<Bytes<32>, Boolean>;

witness ownerKey(): Bytes<32>;
witness get_allocated_amount(): Uint<64>;

pure circuit deriveKey(sk: Bytes<32>): Bytes<32> {
    return persistentHash<Vector<2, Bytes<32>>>([pad(32, "zkpay:owner:v1"), sk]);
}

pure circuit deriveNullifier(sk: Bytes<32>): Bytes<32> {
    return persistentHash<Vector<2, Bytes<32>>>([pad(32, "zkpay:nullifier:v1"), sk]);
}

pure circuit computeCommitment(payee_address: Bytes<32>, amount: Uint<64>, secret_key: Bytes<32>): Bytes<32> {
    const commitment_data = CommitmentData { address: payee_address, amount: amount, secret: secret_key };
    return persistentHash<CommitmentData>(commitment_data);
}

constructor(initial_pool_value: Uint<64>) {
    total_pool_value = initial_pool_value;
    owner = disclose(deriveKey(ownerKey()));
}

export circuit add_payee(commitment: Bytes<32>): [] {
    assert(deriveKey(ownerKey()) == owner, "Only owner can register payees");
    payees_commitments.insert(disclose(commitment), true);
}

export circuit fund_payroll(amount: Uint<64>): [] {
    assert(amount > 0, "Deposit amount must be positive");
    total_pool_value = disclose((total_pool_value + amount) as Uint<64>);
}

export circuit claim_payroll(
    payee_address: Bytes<32>, 
    claim_amount: Uint<64>, 
    secret_key: Bytes<32>
): [] {
    const allocated_amount = get_allocated_amount();
    assert(allocated_amount >= claim_amount, "Claim exceeds allocated private balance");

    const commitment = computeCommitment(payee_address, allocated_amount, secret_key);
    assert(payees_commitments.member(disclose(commitment)), "Payee commitment not found in authorized set");

    assert(total_pool_value >= claim_amount, "Insufficient total pool value");

    const nullifier = deriveNullifier(secret_key);
    assert(!nullifiers.member(nullifier), "Already claimed");
    nullifiers.insert(disclose(nullifier), true);

    total_pool_value = disclose((total_pool_value - claim_amount) as Uint<64>);
}
```

---

## 🛠️ Setup, Build & Run Instructions

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v9.x` or higher
- **Compact Compiler** (optional for local contract compilation): `compact` / `compactc`

### 1️⃣ Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/efekrbas/zkpay-midnight.git
cd zkpay-midnight

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2️⃣ Build and Test Smart Contracts

```bash
# Build TypeScript contract and provider bindings
npm run build

# Run comprehensive circuit logic and privacy tests
npm test
```

### 3️⃣ Test Suite Coverage

The Mocha + Chai test suite in `test/zkpay.test.ts` executes and validates all circuit and privacy requirements:
1. **Contract Initialization**: Verifies initial public liquidity and owner public key derivation.
2. **Owner Authorization**: Confirms owner can register valid commitments; verifies unauthorized registration attempts are strictly rejected.
3. **Liquidity Funding**: Validates depositing funds and rejecting non-positive amounts.
4. **Confidential Claims**: Tests witness salary retrieval, commitment membership validation, nullifier recording, and public pool balance decrement.
5. **Replay Protection**: Confirms duplicate claims with the same secret key fail on the nullifier check.
6. **Over-Claim Protection**: Confirms claims exceeding private allocation fail inside the ZK witness assertion.
7. **Fraudulent Preimage Rejection**: Confirms claims with unauthorized secrets or unlisted commitments fail.

### 4️⃣ Run the Frontend Web Application

```bash
cd frontend

# Lint and build for production
npm run lint
npm run build

# Start local development server
npm run dev
```

Open `http://localhost:5173` in your browser to interact with the ZKPay DApp. The interface supports:
- **1AM / Midnight Lace Wallet Connection** with live network status detection.
- **Employer Portal**: One-click contract deployment, payee commitment registration, real-time commitment calculation, and pool funding.
- **Employee Portal**: Confidential salary claims, witness evaluation, nullifier tracking, and ZK proof generation.
- **Privacy Explorer**: Interactive breakdown of public ledger data vs zero-knowledge private witness data.

---

## 📁 Repository Structure

```
zkpay-midnight/
├── smart-contracts/
│   └── zkpay.compact          # Midnight Compact Smart Contract
├── src/
│   ├── index.ts               # Barrel exports
│   ├── crypto.ts              # Domain-separated persistentHash and nullifiers
│   ├── witnesses.ts           # WitnessContext and private state handlers
│   └── generated/
│       └── zkpay.ts           # Contract interfaces and circuit simulator
├── scripts/
│   ├── deploy.ts              # Midnight SDK contract deployment script
│   └── utils/
│       └── midnightProvider.ts# Real Midnight SDK provider and wallet builder
├── test/
│   └── zkpay.test.ts          # Comprehensive Mocha + Chai ZK test suite
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── midnight.ts    # DApp connector, session, and crypto helpers
│   │   │   └── zkpay.ts       # Contract deployment and circuit caller helpers
│   │   ├── App.tsx            # Dual-portal Employer/Employee React UI
│   │   └── index.css          # Glassmorphic dark styling
│   └── package.json
└── package.json
```

---

*Built with ❤️ for the Midnight Network Ecosystem.*
