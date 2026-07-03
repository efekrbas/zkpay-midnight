import React, { useState } from 'react';
import './index.css';

const hashCommitment = (address: string, amount: number, secret: string) => {
  return `hash(${address},${amount},${secret})`;
};

function App() {
  const [totalPool, setTotalPool] = useState(10000);
  const [commitments] = useState(new Set([hashCommitment('0xAlice', 1500, 'secret42')]));
  
  const [address, setAddress] = useState('0xAlice');
  const [claimAmount, setClaimAmount] = useState('500');
  const [allocatedAmount, setAllocatedAmount] = useState('1500');
  const [secretKey, setSecretKey] = useState('secret42');
  
  const [status, setStatus] = useState<{type: 'idle'|'success'|'error', msg: string}>({type: 'idle', msg: ''});
  const [isSimulating, setIsSimulating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setStatus({type: 'idle', msg: ''});

    // Simulate Proof Generation Delay
    setTimeout(() => {
      try {
        const claim = parseInt(claimAmount);
        const allocated = parseInt(allocatedAmount);

        if (allocated < claim) throw new Error("Claim exceeds allocated private balance");
        
        const comm = hashCommitment(address, allocated, secretKey);
        if (!commitments.has(comm)) throw new Error("Invalid Commitment: Payee not found in shielded set");
        
        if (totalPool < claim) throw new Error("Insufficient total pool liquidity");
        
        setTotalPool(prev => prev - claim);
        setStatus({
          type: 'success', 
          msg: `Zero-Knowledge Proof verified. ${claim} tokens claimed securely.`
        });
      } catch (err: any) {
        setStatus({
          type: 'error', 
          msg: err.message || "Cryptographic Verification Failed"
        });
      } finally {
        setIsSimulating(false);
      }
    }, 1200); 
  };

  return (
    <>
      {/* THE FLUID ISLAND NAVBAR */}
      <nav className="glass-nav animate-fade-up">
        <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.04em' }}>ZKPay</div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }}></div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>Testnet</span>
        </div>
        <button className="premium-btn" onClick={() => setIsConnected(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.5rem' }}>
          {isConnected ? 'Connected: 0xAli...ce' : 'Connect Lace Wallet'}
        </button>
      </nav>

      <main className="macro-pad">
        <div className="bento-grid">
          
          {/* THE ASYMMETRICAL BENTO: LEFT - PUBLIC LEDGER */}
          <div className="outer-shell animate-fade-up delay-100" style={{ transformStyle: 'preserve-3d' }}>
            <div className="inner-core" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              
              <div className="eyebrow-tag">Public Ledger State</div>
              
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', lineHeight: 1.1 }}>
                Total Pool Liquidity
              </h2>
              
              <div style={{ fontSize: '5.5rem', fontWeight: 800, color: 'var(--accent)', textShadow: '0 0 40px rgba(0, 242, 254, 0.25)', marginBottom: '1.5rem', letterSpacing: '-0.05em', lineHeight: 1 }}>
                {totalPool.toLocaleString()}
              </div>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: '90%' }}>
                The cryptographic accumulator tracks the total system liquidity. This balance verifiably decrements upon successful Zero-Knowledge Proofs without exposing user metadata or allocation sizes.
              </p>
            </div>
          </div>

          {/* THE ASYMMETRICAL BENTO: RIGHT - PRIVATE CLAIM */}
          <div className="outer-shell animate-fade-up delay-200" style={{ transformStyle: 'preserve-3d' }}>
            <div className="inner-core">
              
              <div className="eyebrow-tag">Witness Simulator (Local)</div>

              <form onSubmit={handleClaim}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Payee Address</label>
                    <input className="input-premium" type="text" value={address} onChange={e => setAddress(e.target.value)} required />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Private Allocation</label>
                    <input className="input-premium" type="number" value={allocatedAmount} onChange={e => setAllocatedAmount(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Secret Key (Entropy)</label>
                  <input className="input-premium" type="password" value={secretKey} onChange={e => setSecretKey(e.target.value)} required />
                </div>
                
                <div style={{ height: '1px', background: 'var(--border-shell)', margin: '2.5rem 0' }}></div>

                <div className="form-group">
                  <label className="form-label" style={{ color: 'white' }}>Amount to Claim</label>
                  <input className="input-premium" style={{ background: 'rgba(0, 242, 254, 0.05)', borderColor: 'rgba(0, 242, 254, 0.2)', fontSize: '1.5rem', fontWeight: 600 }} type="number" value={claimAmount} onChange={e => setClaimAmount(e.target.value)} required />
                </div>

                <div style={{ marginTop: '2.5rem' }}>
                  <button type="submit" disabled={isSimulating} className="premium-btn">
                    <span>{isSimulating ? 'Generating ZK Proof...' : 'Execute Claim'}</span>
                    
                    {/* BUTTON-IN-BUTTON NESTED ARCHITECTURE */}
                    <div className="btn-icon-wrapper">
                      {isSimulating ? (
                        <div style={{ width: '14px', height: '14px', border: '2px solid black', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      )}
                    </div>
                  </button>
                </div>
              </form>

              {status.msg && (
                <div className={`status-box ${status.type}`}>
                  {status.msg}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Inline animation for the loader */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </>
  );
}

export default App;
