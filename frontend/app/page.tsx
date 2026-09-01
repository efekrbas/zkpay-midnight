'use client';

import dynamic from 'next/dynamic';

const ZKPayApp = dynamic(() => import('@/components/ZKPayApp'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--accent)', fontSize: '1.2rem', fontWeight: 700 }}>
        Initializing ZKPay WebAssembly Engine...
      </div>
    </div>
  ),
});

export default function Page() {
  return <ZKPayApp />;
}
