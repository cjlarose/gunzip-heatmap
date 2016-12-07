import App from './components/app.html';
import fish from './examples/fish.txt.gz';
import gzip from './gzip';

console.log(fish);
gzip(new DataView(fish)).then(({ value, rest }) => {
  console.log('value', value);
  console.log('rest', rest);
});

const app = new App({
  target: document.querySelector('main'),
  data: {
    octets: [
      { data: 0x3c, numBits: 8 },
      { data: 0x68, numBits: 8 },
      { data: 0x31, numBits: 8 },
      { data: 0x3e, numBits: 5 },
      { data: 0x0a, numBits: 4 },

      { data: 0x68, numBits: 2 },
      { data: 0x65, numBits: 8 },
      { data: 0x6c, numBits: 4 },
      { data: 0x6c, numBits: 1 },
      { data: 0x6f, numBits: 7 },
      { data: 0x20, numBits: 10 },
      { data: 0x77, numBits: 10 },
      { data: 0x6f, numBits: 8 },
      { data: 0x72, numBits: 2 },
      { data: 0x6c, numBits: 6 },
      { data: 0x64, numBits: 6 },
      { data: 0x0a, numBits: 2 },

      { data: 0x3c, numBits: 3 },
      { data: 0x2f, numBits: 7 },
      { data: 0x68, numBits: 0 },
      { data: 0x31, numBits: 0 },
      { data: 0x3e, numBits: 0 },
      { data: 0x0a, numBits: 0 },
    ],
  },
});

window.app = app;
