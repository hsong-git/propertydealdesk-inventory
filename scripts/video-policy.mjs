import fs from "node:fs";

export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export function inspectPublicVideo(filePath) {
  const bytes = fs.statSync(filePath).size;
  if (!bytes || bytes > MAX_VIDEO_BYTES) throw new Error("Public MP4 must be nonempty and no larger than 25 MiB");
  const buffer = fs.readFileSync(filePath);
  const topLevel = [];
  const walk = (start, end, context = "") => {
    let offset = start;
    while (offset < end) {
      if (end - offset < 8) throw new Error("Malformed MP4 box");
      let size = buffer.readUInt32BE(offset);
      const type = buffer.toString("latin1", offset + 4, offset + 8);
      let header = 8;
      if (size === 1) { if (end - offset < 16) throw new Error("Malformed MP4 box"); size = Number(buffer.readBigUInt64BE(offset + 8)); header = 16; }
      if (size === 0) size = end - offset;
      if (!Number.isSafeInteger(size) || size < header || offset + size > end) throw new Error("Malformed MP4 box size");
      if (!context) topLevel.push(type);
      if (["uuid", "loci", "©xyz", "XMP_"].includes(type) || (context === "ilst" && type !== "©too")) throw new Error("Public video contains private/source metadata");
      if (["moov", "udta", "ilst", "trak", "mdia"].includes(type)) walk(offset + header, offset + size, type);
      if (type === "meta") walk(offset + header + 4, offset + size, type);
      offset += size;
    }
  };
  walk(0, buffer.length);
  if (!["ftyp", "moov", "mdat"].every((type) => topLevel.includes(type))) throw new Error("Public video must be a complete MP4");
  if (topLevel.indexOf("moov") > topLevel.indexOf("mdat")) throw new Error("Public video must be optimized for streaming (faststart)");
  return { bytes };
}
