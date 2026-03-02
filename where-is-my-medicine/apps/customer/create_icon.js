const fs = require('fs');
const zlib = require('zlib');

const w = 256, h = 256;
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(w, 0);
ihdr.writeUInt32BE(h, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB

const raw = Buffer.alloc((w * 3 + 1) * h);
for (let y = 0; y < h; y++) {
    const off = y * (w * 3 + 1);
    raw[off] = 0; // filter byte
    for (let x = 0; x < w; x++) {
        raw[off + 1 + x * 3] = 13;     // R - #0D
        raw[off + 1 + x * 3 + 1] = 148; // G - #94
        raw[off + 1 + x * 3 + 2] = 136; // B - #88
    }
}

const compressed = zlib.deflateSync(raw);

function chunk(type, data) {
    const buf = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    const crcVal = zlib.crc32(buf);
    crc.writeInt32BE(crcVal);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    return Buffer.concat([len, buf, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
]);

fs.writeFileSync('assets/icon.png', png);
console.log('Created assets/icon.png');
