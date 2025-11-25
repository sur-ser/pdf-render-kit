import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    outDir: 'dist',
    sourcemap: false,
    target: 'node18',
    clean: true,
    minify: false,
});