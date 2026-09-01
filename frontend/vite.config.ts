import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'

const wasmPlugin = typeof wasm === 'function' ? wasm : (wasm as any).default

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasmPlugin(),
  ],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    include: [
      'object-inspect',
    ],
    exclude: [
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/onchain-runtime-v3',
    ],
  },
})






