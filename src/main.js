import HelloWorld from './components/hello_world.html';
import fish from './examples/fish.txt.gz';

console.log(fish);

const app = new HelloWorld({
  target: document.querySelector('main'),
  data: {
    name: 'world',
    files: {
      'fish': fish,
    },
  },
});

window.app = app;
