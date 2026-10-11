/**
 * Browser & Server Document Text Parsers (.pdf, .docx, .txt, .csv, .json, .md)
 * Uses Mozilla PDF.js (via /api/extract server route) + native browser CMap/FlateDecode
 * to extract 100% real text, tables, and bottom-of-page degree/education blocks.
 */

export const LOCAL_SUPPORTED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.txt',
  '.csv',
  '.tsv',
  '.json',
  '.md',
  '.xml',
  '.html',
  '.htm',
  '.rtf',
  '.yaml',
  '.yml',
  '.log',
] as const;

export const LOCAL_SUPPORTED_LABEL = 'PDF, DOCX, TXT, CSV, JSON, MD, XML, HTML, RTF';

/**
 * Strips Chromium/Skia PDF print artifacts, URLs, and binary noise.
 */
export function cleanPdfMetadataNoise(text: string): string {
  return text
    .replace(/Chromium\s+Skia\/PDF\s+m\d+/gi, '')
    .replace(/Skia\/PDF\s+m\d+/gi, '')
    .replace(/https?:\/\/(?:www\.)?puzzlergames\.online[^\s)]*/gi, '')
    .replace(/puzzlergames\.online[^\s)]*/gi, '')
    .replace(/Mozilla\/5\.0[^\n]*/gi, '')
    .replace(/ Creator\b| Producer\b| CreationDate\b| ModDate\b/gi, '')
    .replace(/D:\d{14}[+-Z0-9']*/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Returns true if the uploaded file can be analyzed by the Local Engine Scan.
 * Unsupported formats (images like .png/.jpg/.webp, binary .xlsx/.pptx/.zip, etc.) return false
 * so the app immediately prompts the user to connect an AI API key.
 */
export function isFileSupportedLocally(file: { name: string; type?: string }): boolean {
  const name = (file.name || '').toLowerCase().trim();

  // Explicitly block image, audio, video, and binary archive/spreadsheet formats from local text scan
  if (
    /\.(png|jpg|jpeg|webp|gif|bmp|tiff|tif|heic|svg|xlsx|xls|pptx|ppt|zip|tar|gz|mp3|mp4|wav|mov)$/i.test(
      name
    )
  ) {
    return false;
  }

  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('image/') || mime.startsWith('audio/') || mime.startsWith('video/')) {
    return false;
  }

  if (LOCAL_SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return true;
  }

  if (
    mime === 'application/pdf' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/csv' ||
    mime === 'application/xml' ||
    mime === 'application/rtf'
  ) {
    return true;
  }
  return false;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(buffer).toString('base64');
}

/**
 * Decompresses a raw byte slice in the browser using DecompressionStream
 */
async function tryDecompressBytes(
  compressed: Uint8Array,
  format: 'deflate' | 'deflate-raw'
): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream(format);
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(compressed)).catch(() => {});
    writer.close().catch(() => {});

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let totalLen = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLen += value.byteLength;
      }
    }

    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Decodes PDF literal string escapes
 */
function decodePdfStringLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

/**
 * Parses PDF ToUnicode CMap tables (beginbfchar / beginbfrange) and decodes <HEX> Tj / TJ streams
 * as an offline fallback when server route is unavailable.
 */
function parsePdfStreamsWithToUnicode(decompressedStreams: string[]): string {
  const glyphToUnicode = new Map<number, string>();

  // Pass 1: Collect all ToUnicode CMap mappings across all streams
  for (const s of decompressedStreams) {
    if (!s.includes('beginbfchar') && !s.includes('beginbfrange')) continue;

    const bfCharBlocks = s.match(/beginbfchar([\s\S]*?)endbfchar/g) || [];
    for (const block of bfCharBlocks) {
      const pairs = block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g);
      for (const m of pairs) {
        const srcCode = parseInt(m[1], 16);
        const dstHex = m[2];
        let str = '';
        for (let i = 0; i < dstHex.length; i += 4) {
          const cp = parseInt(dstHex.slice(i, i + 4), 16);
          if (!isNaN(cp) && cp > 0) str += String.fromCodePoint(cp);
        }
        if (str) glyphToUnicode.set(srcCode, str);
      }
    }

    const bfRangeBlocks = s.match(/beginbfrange([\s\S]*?)endbfrange/g) || [];
    for (const block of bfRangeBlocks) {
      const ranges = block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g);
      for (const m of ranges) {
        const startCode = parseInt(m[1], 16);
        const endCode = parseInt(m[2], 16);
        let targetCp = parseInt(m[3], 16);
        for (let code = startCode; code <= endCode && code - startCode < 1024; code++) {
          glyphToUnicode.set(code, String.fromCodePoint(targetCp));
          targetCp++;
        }
      }
    }
  }

  const decodeHexToken = (hex: string): string => {
    const clean = hex.replace(/\s+/g, '');
    let out = '';
    const step = clean.length % 4 === 0 ? 4 : 2;
    for (let i = 0; i < clean.length; i += step) {
      const code = parseInt(clean.slice(i, i + step), 16);
      if (glyphToUnicode.has(code)) {
        out += glyphToUnicode.get(code)!;
      } else if (code >= 32 && code <= 126) {
        out += String.fromCharCode(code);
      }
    }
    return out;
  };

  // Pass 2: Extract text from BT..ET blocks using both literal (...) and hex <...>
  const lines: string[] = [];
  for (const s of decompressedStreams) {
    if (s.includes('beginbfchar') || s.includes('beginbfrange')) continue;
    const btBlocks = s.match(/BT[\s\S]*?ET/g) || [s];
    for (const block of btBlocks) {
      let currentLine = '';

      // Match TJ arrays [...] and Tj operators
      const tokenRegex = /\[([\s\S]*?)\]\s*TJ|\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj|<([0-9A-Fa-f\s]+)>\s*Tj|\b(Td|TD|T\*)\b/g;
      let match: RegExpExecArray | null;
      while ((match = tokenRegex.exec(block)) !== null) {
        if (match[1] !== undefined) {
          // TJ array
          const arr = match[1];
          const subRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9A-Fa-f\s]+)>|(-?\d+(?:\.\d+)?)/g;
          let sub: RegExpExecArray | null;
          while ((sub = subRegex.exec(arr)) !== null) {
            if (sub[1] !== undefined) {
              currentLine += decodePdfStringLiteral(sub[1]);
            } else if (sub[2] !== undefined) {
              currentLine += decodeHexToken(sub[2]);
            } else if (sub[3] !== undefined) {
              const kern = parseFloat(sub[3]);
              if (kern < -120 && !currentLine.endsWith(' ')) {
                currentLine += ' ';
              }
            }
          }
        } else if (match[2] !== undefined) {
          currentLine += decodePdfStringLiteral(match[2]);
        } else if (match[3] !== undefined) {
          currentLine += decodeHexToken(match[3]);
        } else if (match[4] !== undefined) {
          if (currentLine.trim().length >= 2) {
            lines.push(cleanPdfMetadataNoise(currentLine));
            currentLine = '';
          }
        }
      }

      if (currentLine.trim().length >= 2) {
        lines.push(cleanPdfMetadataNoise(currentLine));
      }
    }
  }

  return lines.filter((l) => l.length >= 2).join('\n');
}

/**
 * Extracts text from a PDF ArrayBuffer:
 * 1. First calls /api/extract (Mozilla PDF.js / unpdf with visual Y/X coordinate sorting)
 * 2. Falls back to browser FlateDecode + ToUnicode CMap parser if offline
 */
export async function extractTextFromPdfBuffer(
  buffer: ArrayBuffer,
  fileName = 'document.pdf'
): Promise<{ text: string; pageCount: number }> {
  const bytes = new Uint8Array(buffer);
  const utf8Decoder = new TextDecoder('utf-8', { fatal: false });

  // Check if buffer starts with %PDF- magic bytes. If not (e.g. Cloud Object Storage / Supabase text stream),
  // decode directly as UTF-8 text so both Local Scan and AI Scan receive 100% of the document text.
  const isRealBinaryPdf =
    bytes.length >= 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d;   // -

  if (!isRealBinaryPdf) {
    const utf8Text = cleanPdfMetadataNoise(utf8Decoder.decode(bytes));
    if (utf8Text.length > 0) {
      return { text: utf8Text, pageCount: 1 };
    }
  }

  // Primary: Mozilla PDF.js via Next.js server route (/api/extract)
  try {
    const base64Data = arrayBufferToBase64(buffer);
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, fileName }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.fullText && data.fullText.trim().length > 15) {
        return {
          text: cleanPdfMetadataNoise(data.fullText),
          pageCount: data.pageCount || 1,
        };
      }
    }
  } catch {
    // Fall through to in-browser FlateDecode + CMap parser
  }

  // Fallback: In-browser stream decompression + ToUnicode CMap decoding
  const latin1Decoder = new TextDecoder('latin1');
  const rawPdfString = latin1Decoder.decode(bytes);

  const decompressedStreams: string[] = [];
  const streamRegex = /stream(?:\r\n|\n|\r)/g;
  let match: RegExpExecArray | null;
  let streamCount = 0;

  while ((match = streamRegex.exec(rawPdfString)) !== null && streamCount < 140) {
    const startOffset = match.index + match[0].length;
    const endIdx = rawPdfString.indexOf('endstream', startOffset);
    if (endIdx === -1) break;

    let endOffset = endIdx;
    if (rawPdfString[endOffset - 1] === '\n') endOffset--;
    if (rawPdfString[endOffset - 1] === '\r') endOffset--;

    const len = endOffset - startOffset;
    if (len > 4 && len < 2_000_000) {
      streamCount++;
      const slice = bytes.subarray(startOffset, endOffset);
      let inflated = await tryDecompressBytes(slice, 'deflate');
      if (!inflated || inflated.length === 0) {
        inflated = await tryDecompressBytes(slice, 'deflate-raw');
      }
      if (inflated && inflated.length > 0) {
        decompressedStreams.push(utf8Decoder.decode(inflated));
      } else {
        decompressedStreams.push(latin1Decoder.decode(slice));
      }
    }
  }

  const decodedText = parsePdfStreamsWithToUnicode(decompressedStreams);
  return {
    text: cleanPdfMetadataNoise(decodedText),
    pageCount: Math.max(1, (rawPdfString.match(/\/Type\s*\/Page\b/g) || []).length),
  };
}

/**
 * Extracts text from a .docx Word file (PKZip + word/document.xml)
 */
export async function extractTextFromDocxBuffer(
  buffer: ArrayBuffer,
  fileName = 'document.docx'
): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const utf8Decoder = new TextDecoder('utf-8', { fatal: false });

  // Check if buffer starts with PKZip magic bytes (0x50 0x4B 0x03 0x04). If not (e.g. Cloud Storage text stream),
  // return the decoded UTF-8 text directly.
  const isRealPkZip =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;

  if (!isRealPkZip) {
    const plainText = utf8Decoder.decode(bytes).trim();
    if (plainText.length > 0) {
      return plainText;
    }
  }

  // Try server route first
  try {
    const base64Data = arrayBufferToBase64(buffer);
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, fileName }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.fullText && data.fullText.trim().length > 5) {
        return data.fullText.trim();
      }
    }
  } catch {
    // Fall through to browser PKZip parser
  }

  const view = new DataView(buffer);

  let offset = 0;
  while (offset + 30 < bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) {
      offset++;
      continue;
    }

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const nameStart = offset + 30;
    const entryName = utf8Decoder.decode(bytes.subarray(nameStart, nameStart + fileNameLen));
    const dataStart = nameStart + fileNameLen + extraLen;

    if (entryName === 'word/document.xml') {
      let actualCompressedSize = compressedSize;
      if (actualCompressedSize === 0) {
        for (let j = dataStart; j < bytes.length - 4; j++) {
          if (
            bytes[j] === 0x50 &&
            bytes[j + 1] === 0x4b &&
            (bytes[j + 2] === 0x03 || bytes[j + 2] === 0x01 || bytes[j + 2] === 0x07)
          ) {
            actualCompressedSize = j - dataStart;
            break;
          }
        }
      }

      const slice = bytes.subarray(
        dataStart,
        Math.min(bytes.length, dataStart + actualCompressedSize)
      );
      let xmlContent = '';
      if (compressionMethod === 0) {
        xmlContent = utf8Decoder.decode(slice);
      } else if (compressionMethod === 8) {
        let inflated = await tryDecompressBytes(slice, 'deflate-raw');
        if (!inflated || inflated.length === 0) {
          inflated = await tryDecompressBytes(slice, 'deflate');
        }
        if (inflated && inflated.length > 0) {
          xmlContent = utf8Decoder.decode(inflated);
        }
      }

      if (xmlContent) {
        return xmlContent
          .replace(/<\/w:p>/g, '\n')
          .replace(/<\/w:tr>/g, '\n')
          .replace(/<\/w:tc>/g, ' | ')
          .replace(/<w:tab\/>/g, '  ')
          .replace(/<w:br[^/>]*\/>/g, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .split('\n')
          .map((l) => l.replace(/\s+/g, ' ').trim())
          .filter((l) => l.length > 0)
          .join('\n');
      }
      break;
    }

    offset = dataStart + Math.max(compressedSize, 1);
  }

  return '';
}
