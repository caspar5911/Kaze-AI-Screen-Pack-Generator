type ZipEntry = {
  filename: string;
  content: string;
};

const encoder = new TextEncoder();
const crcTable = createCrcTable();

export function downloadMarkdownZip(
  files: Record<string, string>,
  zipFilename: string
): void {
  const entries = Object.entries(files)
    .filter(([, content]) => content.trim().length > 0)
    .map(([filename, content]) => ({ filename, content }));

  if (entries.length === 0) {
    return;
  }

  const zipBytes = createZip(entries);
  const zipBuffer = zipBytes.buffer.slice(
    zipBytes.byteOffset,
    zipBytes.byteOffset + zipBytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([zipBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createZip(entries: ZipEntry[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const filenameBytes = encoder.encode(entry.filename);
    const contentBytes = encoder.encode(entry.content);
    const crc = crc32(contentBytes);

    const localHeader = concatBytes(
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(contentBytes.length),
      u32(contentBytes.length),
      u16(filenameBytes.length),
      u16(0),
      filenameBytes
    );

    const centralHeader = concatBytes(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(contentBytes.length),
      u32(contentBytes.length),
      u16(filenameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      filenameBytes
    );

    localParts.push(localHeader, contentBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  });

  const centralDirectory = concatBytes(...centralParts);
  const endRecord = concatBytes(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0)
  );

  return concatBytes(...localParts, centralDirectory, endRecord);
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let cursor = 0;

  chunks.forEach((chunk) => {
    output.set(chunk, cursor);
    cursor += chunk.length;
  });

  return output;
}

function u16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, value, true);
  return bytes;
}

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value >>> 0, true);
  return bytes;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  bytes.forEach((byte) => {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  });

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }

  return table;
}
