import svelte from 'rollup-plugin-svelte';
import buble from 'rollup-plugin-buble';
import { createFilter } from 'rollup-pluginutils';
import { readFile } from 'fs';

function binaryToBlob(options = {}) {
  const filter = createFilter(options.include, options.exclude);
  return {
    name: 'binary-to-blob',
    load(id) {
      if (!filter(id)) { return null; }
      return new Promise((resolve, reject) => {
        readFile(id, (err, data) => {
          if (err) {
            reject(err);
            return;
          }

          const octetsArray = data.toJSON().data.map(b => `0x${b.toString(16)}`).join(',');
          resolve({
            code: `export default Uint8Array.from([${octetsArray}]).buffer;`,
            map: { mappings: '' },
          });
        });
      });
    },
  };
}

export default {
  entry: 'src/main.js',
  dest: 'public/bundle.js',
  format: 'iife',
  plugins: [
    svelte({
      include: 'src/components/**.html',
    }),
    binaryToBlob({
      include: 'src/**/*.gz',
    }),
    buble(),
  ],
};
