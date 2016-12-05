function dataviewsEqual(a, b) {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  const aBytes = new Uint8Array(a);
  const bBytes = new Uint8Array(b);

  for (let i = 0; i < a.byteLength; i += 1) {
    if (aBytes[i] !== bBytes[i]) {
      return false;
    }
  }

  return true;
}


function string(expected) { // input buffer
  return view => // input DataView
    new Promise((resolve, reject) => {
      if (view.byteLength < expected.byteLength) {
        reject('Input shorter than expected');
        return;
      }

      const expectedView = new DataView(expected);
      const actual = new DataView(view.buffer, view.byteOffset, expected.byteLength);

      if (dataviewsEqual(expectedView, actual)) {
        const rest = new DataView(view.buffer, view.byteOffset + expected.byteLength);
        resolve({ value: actual, rest });
      } else {
        reject(`Expected ${expectedView}, found ${actual}`);
      }
    });
}

function compressionMethod() {
  return view =>
    new Promise((resolve, reject) => {
      if (view.byteLength === 0) {
        reject('End of input');
        return;
      }

      const firstByte = view.getUint8(0);
      const rest = new DataView(view.buffer, view.byteOffset + 1);
      resolve({ value: firstByte, rest });
    });
}

function flags() {
  return view =>
    new Promise((resolve, reject) => {
      if (view.byteLength === 0) {
        reject('End of input');
        return;
      }

      const firstByte = view.getUint8(0);
      const rest = new DataView(view.buffer, view.byteOffset + 1);

      const value = {
        FTEXT: (firstByte & 0b00000001) !== 0,
        FHCRC: (firstByte & 0b00000010) !== 0,
        FEXTRA: (firstByte & 0b00000100) !== 0,
        FNAME: (firstByte & 0b00001000) !== 0,
        FCOMMENT: (firstByte & 0b00010000) !== 0,
      };
      resolve({ value, rest });
    });
}

function mtime() {
  return view =>
    new Promise((resolve, reject) => {
      if (view.byteLength < 4) {
        reject('End of input');
        return;
      }

      const mtimeInt = view.getUint32(0, true);
      const rest = new DataView(view.buffer, view.byteOffset + 4);

      if (mtimeInt === 0) {
        resolve({ value: null, rest });
        return;
      }

      resolve({ value: new Date(mtimeInt * 1000), rest });
    });
}

function then(p1, p2) {
  return view =>
    p1(view).then(({ rest }) => p2(rest));
}

function seq(...args) {
  return (view) => {
    let promise = Promise.resolve({ results: [], rest: view });
    for (let i = 0; i < args.length; i += 1) {
      promise = promise.then(({ results, rest }) =>
        args[i](rest).then(newParse =>
          ({ results: [...results, newParse.value], rest: newParse.rest })));
    }
    return promise;
  };
}

function gzip(input) {
  const inputView = new DataView(input);
  const magicHeader = string(Uint8Array.from([0x1f, 0x8b]).buffer);
  const memberHeader = then(magicHeader, seq(compressionMethod(), flags(), mtime()));
  return memberHeader(inputView);
}

export default gzip;
