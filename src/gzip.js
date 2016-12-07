import { string, anyByte, mapValue, then, seq, chain, succeed, nullTerminatedString } from './parse';

function flags(view) {
  return new Promise((resolve, reject) => {
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

function modifiedTime(view) {
  return new Promise((resolve, reject) => {
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

function operatingSystem(view) {
  return new Promise((resolve, reject) => {
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

function deflate(extraFlags) {
  return view =>
    new Promise((resolve, reject) => {
      resolve({ value: 'TODO', rest: view });
    });
}

function parserFromHeader(header) {
  if (header.cm !== 8) {
    throw new Error(`Unknown compression method ${header.cm}`);
  }

  let parser = succeed();

  // TODO: handle flags FEXTRA, FCOMMENT, FHCRC
  if (header.flg.FNAME) {
    parser = then(parser, nullTerminatedString);
  }

  return parser;
  //return seq(parser, deflate());
}

function headerToObj([cm, flg, mtime, xfl, os]) {
  return { cm, flg, mtime, xfl, os };
}

export default (() => {
  const magicHeader = string(Uint8Array.from([0x1f, 0x8b]).buffer);
  const compressionMethod = anyByte;
  const extraFlags = anyByte;
  const headerPrologue = seq(compressionMethod,
                             flags,
                             modifiedTime,
                             extraFlags,
                             operatingSystem);
  const headerParser = mapValue(then(magicHeader, headerPrologue), headerToObj);
  return chain(headerParser, parserFromHeader);
})();
