import HelloWorld from './components/hello_world.html'

var app = new HelloWorld({
  target: document.querySelector( 'main' ),
  data: {
    name: 'world'
  }
});
