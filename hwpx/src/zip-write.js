// Minimal ZIP writer — zero dependencies.
// Works in browser and Node >=18 (uses CompressionStream for deflate).
// HWPX convention: pass mimetype as the FIRST entry with store:true
// (same first-entry convention as EPUB/ODF containers).

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * @param {Array<{name: string, data: Uint8Array|string, store?: boolean}>} files
 * @param {{date?: Date}} [opts] fixed default date keeps output deterministic for tests
 * @returns {Promise<Uint8Array>}
 */
export async function writeZip(files, { date = new Date(2026, 0, 1) } = {}) {
  const enc = new TextEncoder();
  const dosTime = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;

  const parts = [];
  const centrals = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const raw = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = crc32(raw);
    const method = f.store ? 0 : 8;
    const data = f.store ? raw : await deflateRaw(raw);
    // bit 11: UTF-8 filename, only needed for non-ASCII names
    const flags = /^[\x20-\x7e]*$/.test(f.name) ? 0 : 0x0800;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, flags, true);
    local.setUint16(8, method, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, raw.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true); // extra len

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true); // version made by
    central.setUint16(6, 20, true); // version needed
    central.setUint16(8, flags, true);
    central.setUint16(10, method, true);
    central.setUint16(12, dosTime, true);
    central.setUint16(14, dosDate, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, data.length, true);
    central.setUint32(24, raw.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true); // extra len
    central.setUint16(32, 0, true); // comment len
    central.setUint16(34, 0, true); // disk number
    central.setUint16(36, 0, true); // internal attrs
    central.setUint32(38, 0, true); // external attrs
    central.setUint32(42, offset, true);
    centrals.push(new Uint8Array(central.buffer), nameBytes);

    parts.push(new Uint8Array(local.buffer), nameBytes, data);
    offset += 30 + nameBytes.length + data.length;
  }

  let cenSize = 0;
  for (const c of centrals) cenSize += c.length;

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, files.length, true);
  eocd.setUint16(10, files.length, true);
  eocd.setUint32(12, cenSize, true);
  eocd.setUint32(16, offset, true);
  eocd.setUint16(20, 0, true);

  return concat([...parts, ...centrals, new Uint8Array(eocd.buffer)]);
}

function concat(arrays) {
  let total = 0;
  for (const a of arrays) total += a.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const a of arrays) {
    out.set(a, p);
    p += a.length;
  }
  return out;
}

async function deflateRaw(data) {
  const cs = new CompressionStream('deflate-raw');
  const resp = new Response(new Blob([data]).stream().pipeThrough(cs));
  return new Uint8Array(await resp.arrayBuffer());
}
