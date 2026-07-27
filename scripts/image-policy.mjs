import fs from "node:fs";

const PRIVATE_PNG_CHUNKS = new Set(["eXIf", "iCCP", "tEXt", "zTXt", "iTXt"]);
const PRIVATE_WEBP_CHUNKS = new Set(["EXIF", "ICCP", "XMP "]);

function parseWebp(buffer) {
  if (buffer.length < 20 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const metadata = [];
  let width = null;
  let height = null;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (PRIVATE_WEBP_CHUNKS.has(type)) metadata.push(type.trim());
    if (type === "VP8X" && size >= 10) {
      width = 1 + buffer.readUIntLE(data + 4, 3);
      height = 1 + buffer.readUIntLE(data + 7, 3);
    } else if (type === "VP8 " && size >= 10 && buffer.toString("hex", data + 3, data + 6) === "9d012a") {
      width = buffer.readUInt16LE(data + 6) & 0x3fff;
      height = buffer.readUInt16LE(data + 8) & 0x3fff;
    } else if (type === "VP8L" && size >= 5 && buffer[data] === 0x2f) {
      width = 1 + buffer[data + 1] + ((buffer[data + 2] & 0x3f) << 8);
      height = 1 + ((buffer[data + 2] >> 6) | (buffer[data + 3] << 2) | ((buffer[data + 4] & 0x0f) << 10));
    }
    offset = data + size + (size % 2);
  }
  return { format: "webp", width, height, metadata };
}

function parsePng(buffer) {
  if (buffer.length < 24 || buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a") return null;
  const metadata = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const size = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (PRIVATE_PNG_CHUNKS.has(type)) metadata.push(type);
    offset += 12 + size;
  }
  return { format: "png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), metadata };
}

function parseJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  const metadata = [];
  let width = null;
  let height = null;
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    const size = buffer.readUInt16BE(offset + 2);
    if (size < 2 || offset + 2 + size > buffer.length) break;
    const payloadStart = offset + 4;
    const header = buffer.toString("latin1", payloadStart, Math.min(offset + 2 + size, payloadStart + 64));
    if (marker === 0xe1 && (header.startsWith("Exif\0\0") || header.includes("xap/1.0"))) metadata.push(header.startsWith("Exif") ? "EXIF" : "XMP");
    if (marker === 0xe2 && header.startsWith("ICC_PROFILE")) metadata.push("ICC");
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && size >= 7) {
      height = buffer.readUInt16BE(payloadStart + 1);
      width = buffer.readUInt16BE(payloadStart + 3);
    }
    offset += 2 + size;
  }
  return { format: "jpeg", width, height, metadata };
}

export function inspectPublicImage(filePath) {
  const buffer = fs.readFileSync(filePath);
  const parsed = parseWebp(buffer) || parsePng(buffer) || parseJpeg(buffer);
  if (!parsed) throw new Error(`Unsupported or invalid public image: ${filePath}`);
  return { ...parsed, bytes: buffer.length };
}
