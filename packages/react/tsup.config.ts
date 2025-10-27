import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.test.*', '!src/__tests__/**'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  outDir: 'dist',
  minify: false,
  target: 'es2020',
  external: ['react', 'react-dom'], // Mark React as external
  bundle: false, // Disable bundling to preserve directory structure
  // No global banner needed - individual files have 'use client' where required
  // banner: {
  //   js: `"use client";`,
  // },
})
