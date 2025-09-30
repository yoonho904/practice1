import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WaveParticleViz',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['three', '@bio-sim/quantum-engine'],
      output: {
        globals: {
          'three': 'THREE',
          '@bio-sim/quantum-engine': 'QuantumEngine'
        }
      }
    }
  },
  server: {
    port: 3001,
    open: '/dev/index.html'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@bio-sim/quantum-engine': resolve(__dirname, '../../services/quantum-engine/src')
    }
  }
});