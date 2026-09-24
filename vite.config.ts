import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this repository below /scraplinesurvivor/.
  base: command === 'build' ? '/scraplinesurvivor/' : '/',
}));
