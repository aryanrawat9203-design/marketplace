import zlib from "zlib";

// Minimal, dependency-free ZIP writer (DEFLATE). Standard ZIP (no ZIP64):
// fine for our scale (<65,535 files, <4 GB total).

let CRC_TABLE: Uint32Array | null = null;
function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  CRC_TABLE = t;
  return t;
}
function crc32(buf: Buffer): number {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; data: Buffer };

/**
 * Builds a ZIP one entry at a time.
 *
 * The full-library tier archives ~10k templates. Collecting every uncompressed
 * entry first and only then zipping meant holding the whole corpus in memory
 * (~1.9 GB RSS) before a single byte was compressed. Adding entries as they
 * arrive lets the caller release each source buffer immediately, so peak memory
 * is the compressed output rather than the compressed output plus all of the
 * input.
 *
 * `createZip` is implemented on top of this, so the two cannot produce
 * different bytes.
 */
export class ZipBuilder {
  private parts: Buffer[] = [];
  private central: Buffer[] = [];
  private offset = 0;
  private count = 0;

  add(e: ZipEntry): void {
    const nameBuf = Buffer.from(e.name.replace(/\\/g, "/"), "utf8");
    const crc = crc32(e.data);
    const compressed = zlib.deflateRawSync(e.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    this.parts.push(local, nameBuf, compressed);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(this.offset, 42);
    this.central.push(cd, nameBuf);

    this.offset += local.length + nameBuf.length + compressed.length;
    this.count++;
  }

  /** Number of entries added so far. */
  get size(): number {
    return this.count;
  }

  finish(): Buffer {
    const cdBuf = Buffer.concat(this.central);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.count, 8);
    eocd.writeUInt16LE(this.count, 10);
    eocd.writeUInt32LE(cdBuf.length, 12);
    eocd.writeUInt32LE(this.offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...this.parts, cdBuf, eocd]);
  }
}

export function createZip(entries: ZipEntry[]): Buffer {
  const b = new ZipBuilder();
  for (const e of entries) b.add(e);
  return b.finish();
}
