// rollup.config.js
import svelte from 'rollup-plugin-svelte';
import buble from 'rollup-plugin-buble';

export default {
  entry: 'src/main.js',
  dest: 'public/bundle.js',
  format: 'iife',
  plugins: [
    svelte({
      include: 'src/components/**.html',
    }),
    buble(),
  ],
};
