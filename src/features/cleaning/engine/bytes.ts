/** Small byte helpers shared by the container rewriters. No decoding, no allocation surprises. */

export class ByteReader {
  constructor(
    readonly bytes: Uint8Array,
    readonly littleEndian = false,
  ) {}

  get length(): number {
    return this.bytes.length;
  }

  u8(offset: number): number {
    this.check(offset, 1);
    return this.bytes[offset];
  }

  u16(offset: number, littleEndian = this.littleEndian): number {
    this.check(offset, 2);
    const b = this.bytes;
    return littleEndian ? b[offset] | (b[offset + 1] << 8) : (b[offset] << 8) | b[offset + 1];
  }

  u32(offset: number, littleEndian = this.littleEndian): number {
    this.check(offset, 4);
    const b = this.bytes;
    return littleEndian
      ? (b[offset] | (b[offset + 1] << 8) | (b[offset + 2] << 16) | (b[offset + 3] << 24)) >>> 0
      : ((b[offset] << 24) | (b[offset + 1] << 16) | (b[offset + 2] << 8) | b[offset + 3]) >>> 0;
  }

  u64(offset: number): number {
    const hi = this.u32(offset, false);
    const lo = this.u32(offset + 4, false);
    return hi * 0x1_0000_0000 + lo;
  }

  slice(offset: number, length: number): Uint8Array {
    this.check(offset, length);
    return this.bytes.subarray(offset, offset + length);
  }

  ascii(offset: number, length: number): string {
    return asciiOf(this.slice(offset, length));
  }

  /** NUL-terminated ASCII/UTF-8 string starting at offset; returns the string and the offset after the NUL. */
  cstring(offset: number): { value: string; next: number } {
    let end = offset;
    while (end < this.bytes.length && this.bytes[end] !== 0) end += 1;
    return { value: utf8Of(this.bytes.subarray(offset, end)), next: Math.min(end + 1, this.bytes.length) };
  }

  private check(offset: number, length: number): void {
    if (offset < 0 || length < 0 || offset + length > this.bytes.length) {
      throw new RangeError(`read out of bounds (${offset}+${length} > ${this.bytes.length})`);
    }
  }
}

export class ByteWriter {
  private chunks: Uint8Array[] = [];
  private total = 0;

  get length(): number {
    return this.total;
  }

  bytes(data: Uint8Array): this {
    this.chunks.push(data);
    this.total += data.length;
    return this;
  }

  u8(value: number): this {
    return this.bytes(Uint8Array.of(value & 0xff));
  }

  u16(value: number, littleEndian = false): this {
    const out = new Uint8Array(2);
    if (littleEndian) {
      out[0] = value & 0xff;
      out[1] = (value >>> 8) & 0xff;
    } else {
      out[0] = (value >>> 8) & 0xff;
      out[1] = value & 0xff;
    }
    return this.bytes(out);
  }

  u32(value: number, littleEndian = false): this {
    const out = new Uint8Array(4);
    if (littleEndian) {
      out[0] = value & 0xff;
      out[1] = (value >>> 8) & 0xff;
      out[2] = (value >>> 16) & 0xff;
      out[3] = (value >>> 24) & 0xff;
    } else {
      out[0] = (value >>> 24) & 0xff;
      out[1] = (value >>> 16) & 0xff;
      out[2] = (value >>> 8) & 0xff;
      out[3] = value & 0xff;
    }
    return this.bytes(out);
  }

  ascii(text: string): this {
    return this.bytes(asciiBytes(text));
  }

  toUint8Array(): Uint8Array {
    return concat(this.chunks);
  }
}

export function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

export function asciiOf(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text;
}

const decoder = new TextDecoder('utf-8');
const encoder = new TextEncoder();

export function utf8Of(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

export function utf8Bytes(text: string): Uint8Array {
  return encoder.encode(text);
}

export function startsWith(bytes: Uint8Array, prefix: Uint8Array | string, offset = 0): boolean {
  const p = typeof prefix === 'string' ? asciiBytes(prefix) : prefix;
  if (offset + p.length > bytes.length) return false;
  for (let i = 0; i < p.length; i += 1) if (bytes[offset + i] !== p[i]) return false;
  return true;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

let crcTable: Uint32Array | null = null;

/** CRC-32 (IEEE) as used by PNG chunks. */
export function crc32(...parts: Uint8Array[]): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const part of parts) {
    for (const byte of part) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
