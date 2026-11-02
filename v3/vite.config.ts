import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], base: './', build: { target: 'safari15.6', outDir: 'dist-l2' } });
