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

function anyByte() {
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

function modifiedTime() {
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

function operatingSystem() {
  return view =>
    new Promise((resolve, reject) => {
      if (view.byteLength === 0) {
        reject('End of input');
        return;
      }

      const firstByte = view.getUint8(0);
      const rest = new DataView(view.buffer, view.byteOffset + 1);

      let value;
      switch (firstByte) {
        case 0:
          value = 'FAT filesystem (MS-DOS, OS/2, NT/Win32)';
          break;
        case 1:
          value = 'Amiga';
          break;
        case 2:
          value = 'VMS (or OpenVMS)';
          break;
        case 3:
          value = 'Unix';
          break;
        case 4:
          value = 'VM/CMS';
          break;
        case 5:
          value = 'Atari TOS';
          break;
        case 6:
          value = 'HPFS filesystem (OS/2, NT)';
          break;
        case 7:
          value = 'Macintosh';
          break;
        case 8:
          value = 'Z-System';
          break;
        case 9:
          value = 'CP/M';
          break;
        case 10:
          value = 'TOPS-20';
          break;
        case 11:
          value = 'NTFS filesystem (NT)';
          break;
        case 12:
          value = 'QDOS';
          break;
        case 13:
          value = 'Acorn RISCOS';
          break;
        case 255:
          value = 'unknown';
          break;
        default:
      }
      resolve({ value, rest });
    });
}

function then(p1, p2) {
  return view =>
    p1(view).then(({ rest }) => p2(rest));
}

function seq(...args) {
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

function chain(parser, nextParserFn) {
  return view =>
    parser(view).then(({ value, rest }) => nextParserFn(value)(rest));
}

function mapValue(parser, transform) {
  return view => parser(view).then(({ value, rest }) => ({ value: transform(value), rest }));
}

function headerToObj([cm, flg, mtime, xfl, os]) {
  return { cm, flg, mtime, xfl, os };
}

function deflate() {
  return view =>
    new Promise((resolve, reject) => {
      resolve({ value: 'TODO', rest: view });
    });
}

function nullTerminatedString() {
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

function succeed(value) {
  return view => Promise.resolve({ value, rest: view });
}

function parserFromHeader(header) {
  if (header.cm !== 8) {
    throw new Error(`Unknown compression method ${header.cm}`);
  }

  let parser = succeed();

  // TODO: handle flags FEXTRA, FCOMMENT, FHCRC
  if (header.flg.FNAME) {
    parser = then(parser, nullTerminatedString());
  }

  return parser;
  //return seq(parser, deflate());
}

function gzip() {
  const magicHeader = string(Uint8Array.from([0x1f, 0x8b]).buffer);
  const compressionMethod = anyByte;
  const extraFlags = anyByte;
  const headerParser = mapValue(then(magicHeader, seq(compressionMethod(), flags(), modifiedTime(), extraFlags(), operatingSystem())), headerToObj);
  //return headerParser;
  return chain(headerParser, parserFromHeader);
}

export default gzip;
