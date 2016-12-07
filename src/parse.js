export function succeed(value) {
  return view => Promise.resolve({ value, rest: view });
}

export function anyByte() {
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

export function string(expected) { // input buffer
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

export function nullTerminatedString() {
  return view =>
    new Promise((resolve, reject) => {
      for (let i = 0; i < view.byteLength; i += 1) {
        const endOffset = view.byteOffset + i;
        if (view.getUint8(i) === 0) {
          const chars = new Uint8Array(view.buffer, view.byteOffset, i);
          // TODO: Read as iso8601 instead of ascii
          const value = String.fromCharCode.apply(null, chars);
          const rest = new DataView(view.buffer, endOffset + 1);
          resolve({ value, rest });
          return;
        }
      }
      reject('Unexepcted end of input');
    });
}

export function mapValue(parser, transform) {
  return view => parser(view).then(({ value, rest }) => ({ value: transform(value), rest }));
}

export function then(p1, p2) {
  return view =>
    p1(view).then(({ rest }) => p2(rest));
}

export function seq(...args) {
  return (view) => {
    let promise = Promise.resolve({ value: [], rest: view });
    for (let i = 0; i < args.length; i += 1) {
      promise = promise.then(({ value, rest }) =>
        args[i](rest).then(newParse =>
          ({ value: [...value, newParse.value], rest: newParse.rest })));
    }
    return promise;
  };
}

export function chain(parser, nextParserFn) {
  return view =>
    parser(view).then(({ value, rest }) => nextParserFn(value)(rest));
}
