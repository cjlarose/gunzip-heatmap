import svelte from 'rollup-plugin-svelte';
import buble from 'rollup-plugin-buble';
import string from 'rollup-plugin-string';

export default {
  entry: 'src/main.js',
  dest: 'public/bundle.js',
  format: 'iife',
  plugins: [
    svelte({
      include: 'src/components/**.html',
    }),
    string({
      include: 'src/**/*.gz',
    }),
    buble(),
  ],
};
