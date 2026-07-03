# ZKPay - Confidential Payroll & Splits Protocol

![CI Tests](https://github.com/YOUR_GITHUB_USERNAME/zkpay-midnight/actions/workflows/test.yml/badge.svg)

ZKPay is a decentralized application built on the Midnight Network that enables confidential payroll and payment splits. 

## Live Demo & Video
- **Live Demo Link:** [Insert Vercel/Netlify Link Here]
- **Demo Video (1 min):** [Insert YouTube/Loom Link Here]

## Privacy Model
ZKPay meaningfully utilizes Midnight’s rational privacy model to balance transparency and confidentiality. Using the Compact language, we define distinct public ledger states and local private states (witnesses).

### What an Observer CAN Learn (Public State)
- The **`total_pool_value`**: Observers can see the total aggregate balance available for payroll/splits. This ensures public verifiability that the contract is adequately funded and solvent.
- The **Cryptographic Set**: Observers can see that cryptographic commitments exist on the ledger (`payees_commitments`), verifying that *entities* have been authorized to claim funds.
- **State Transitions**: Observers know when a `claim_payroll` transaction is executed and can see the public pool decrementing by the claimed amount.

### What an Observer CANNOT Learn (Private State)
- **Payee Identities**: The 32-byte address of the authorized payee is heavily shielded.
- **Individual Allocations**: The specific `allocated_amount` for each payee is hidden off-chain and injected locally via a ZK witness.
- **Linkability**: When a claim is made, observers cannot cryptographically link the transaction to a specific payee or their specific allowance without the `secret_key`. The verification is purely zero-knowledge.

## Testing
We have built a comprehensive test suite simulating the Midnight compact runtime for integration testing.

```bash
npm install
npm test
```

*(Place screenshot of 3+ passing tests here for submission)*