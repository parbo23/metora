import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ByteWriter, asciiBytes, concat } from '../engine/bytes';
import { readImageInfo } from '../engine/imageInfo';
import { cleanImageBytes } from '../engine/index';

const FIXTURES = join(__dirname, '..', '..', '..', 'services', '__fixtures__');
const fixture = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, name)));

function box(type: string, ...payload: Uint8Array[]): Uint8Array {
  const body = concat(payload);
  const w = new ByteWriter();
  w.u32(8 + body.length)
    .ascii(type)
    .bytes(body);
  return w.toUint8Array();
}
function fullBox(type: string, version: number, ...payload: Uint8Array[]): Uint8Array {
  return box(type, Uint8Array.of(version, 0, 0, 0), ...payload);
}
function u32(n: number): Uint8Array {
  const w = new ByteWriter();
  w.u32(n);
  return w.toUint8Array();
}

/** meta(pitm, iprp(ipco(ispe, irot), ipma)) — enough for dimension lookup. */
function syntheticHeic(width: number, height: number, rotationQuarterTurns: number): Uint8Array {
  const ftyp = box('ftyp', asciiBytes('heic'), u32(0), asciiBytes('mif1heic'));
  const pitm = fullBox('pitm', 0, Uint8Array.of(0, 1));
  const ispe = fullBox('ispe', 0, u32(width), u32(height));
  const irot = box('irot', Uint8Array.of(rotationQuarterTurns));
  const ipco = box('ipco', ispe, irot);
  // ipma v0, flags 0: entry_count=1; item 1 → properties [1, 2]
  const ipma = fullBox('ipma', 0, u32(1), Uint8Array.of(0, 1), Uint8Array.of(2), Uint8Array.of(0x81, 0x02));
  const iprp = box('iprp', ipco, ipma);
  const hdlr = fullBox('hdlr', 0, u32(0), asciiBytes('pict'), new Uint8Array(12), Uint8Array.of(0));
  const meta = fullBox('meta', 0, hdlr, pitm, iprp);
  return concat([ftyp, meta, box('mdat', asciiBytes('x'))]);
}

describe('readImageInfo', () => {
  it('reads JPEG dimensions, orientation and display size', () => {
    const info = readImageInfo(fixture('gps-camera-date.jpg'));
    expect(info.format).toBe('jpeg');
    expect(info.width).toBe(64);
    expect(info.height).toBe(48);
    expect(info.orientation).toBe(6); // rotate 90° CW → displayed portrait
    expect(info.displayWidth).toBe(48);
    expect(info.displayHeight).toBe(64);
    expect(info.byteLength).toBeGreaterThan(0);
  });

  it('reads a JPEG without EXIF as orientation-less', () => {
    const info = readImageInfo(fixture('no-metadata.jpg'));
    expect(info).toMatchObject({
      format: 'jpeg',
      width: 64,
      height: 48,
      orientation: null,
      displayWidth: 64,
    });
  });

  it('reads PNG dimensions from IHDR', () => {
    const info = readImageInfo(fixture('metadata.png'));
    expect(info.format).toBe('png');
    expect(info.width).toBe(64);
    expect(info.height).toBe(48);
    expect(info.orientation).toBeNull();
  });

  it('reads HEIF dimensions from the primary item and honours irot', () => {
    expect(readImageInfo(syntheticHeic(4032, 3024, 0))).toMatchObject({
      format: 'heic',
      width: 4032,
      height: 3024,
      displayWidth: 4032,
      displayHeight: 3024,
    });
    expect(readImageInfo(syntheticHeic(4032, 3024, 1))).toMatchObject({
      displayWidth: 3024,
      displayHeight: 4032,
    });
  });

  it('reports unknown files without dimensions instead of throwing', () => {
    const info = readImageInfo(fixture('malformed.jpg'));
    expect(info.width).toBeNull();
    expect(info.height).toBeNull();
  });

  it('cleaning keeps format and stored dimensions for every mode', () => {
    const source = fixture('gps-camera-date.jpg');
    const before = readImageInfo(source);
    for (const mode of ['location', 'camera', 'dateTime', 'all'] as const) {
      const after = readImageInfo(cleanImageBytes(source, mode).bytes);
      expect(after.format).toBe(before.format);
      expect(after.width).toBe(before.width);
      expect(after.height).toBe(before.height);
      // Orientation is structural and survives even "all".
      expect(after.orientation).toBe(6);
    }
  });
});
