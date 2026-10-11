import { NextRequest, NextResponse } from 'next/server';
import { getDocumentProxy } from 'unpdf';
import zlib from 'zlib';

export const runtime = 'nodejs';

function cleanBrowserPdfArtifacts(text: string): string {
  return text
    .replace(/Chromium\s+Skia\/PDF\s+m\d+/gi, '')
    .replace(/Skia\/PDF\s+m\d+/gi, '')
    .replace(/https?:\/\/(?:www\.)?puzzlergames\.online[^\s)]*/gi, '')
    .replace(/puzzlergames\.online[^\s)]*/gi, '')
    .replace(/about:blank/gi, '')
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*(?:AM|PM)\b/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Extracts text from a PDF buffer using Mozilla's PDF.js (via unpdf)
 * with visual coordinate sorting (top-to-bottom Y, left-to-right X) so
 * headers, tables, multi-column blocks, and bottom-of-page Degree/Education
 * entries are reconstructed in exact human reading order.
 */
async function extractPdfWithCoordinates(uint8: Uint8Array): Promise<{
  fullText: string;
  pageCount: number;
  lines: string[];
}> {
  const pdf = await getDocumentProxy(uint8);
  const rawPageCount = pdf.numPages || 1;
  const allLines: string[] = [];
  const nonEmptyPages: string[] = [];

  for (let p = 1; p <= rawPageCount; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const rawItems = (textContent.items || []) as Array<{
      str?: string;
      transform?: number[];
      width?: number;
      hasEOL?: boolean;
    }>;

    // Group items by visual Y coordinate (bucketed to 3.5pt tolerance)
    interface PositionedItem {
      str: string;
      x: number;
      y: number;
    }

    const validItems: PositionedItem[] = [];
    for (const item of rawItems) {
      if (!item.str || !item.str.trim()) continue;
      const x = Array.isArray(item.transform) ? Number(item.transform[4] || 0) : 0;
      const y = Array.isArray(item.transform) ? Number(item.transform[5] || 0) : 0;
      validItems.push({ str: item.str, x, y });
    }

    // Sort top-to-bottom (higher Y is higher on PDF page), then left-to-right (lower X first)
    validItems.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 3.5) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    // Merge items on the same horizontal line (within 3.5pt Y tolerance)
    const pageLines: { y: number; parts: { x: number; str: string }[] }[] = [];
    for (const item of validItems) {
      const existingLine = pageLines.find((line) => Math.abs(line.y - item.y) <= 3.5);
      if (existingLine) {
        existingLine.parts.push({ x: item.x, str: item.str });
      } else {
        pageLines.push({ y: item.y, parts: [{ x: item.x, str: item.str }] });
      }
    }

    const cleanedPageLines: string[] = [];
    for (const line of pageLines) {
      line.parts.sort((a, b) => a.x - b.x);
      let lineStr = '';
      let lastX = -1;
      for (const part of line.parts) {
        const trimmed = part.str.trim();
        if (!trimmed) continue;
        if (lastX >= 0 && part.x - lastX > 65) {
          lineStr += '  |  ' + trimmed;
        } else if (lineStr.length > 0) {
          lineStr += ' ' + trimmed;
        } else {
          lineStr = trimmed;
        }
        lastX = part.x + trimmed.length * 4.5;
      }

      const cleanedLine = cleanBrowserPdfArtifacts(lineStr);
      if (cleanedLine.length >= 2) {
        cleanedPageLines.push(cleanedLine);
        allLines.push(cleanedLine);
      }
    }

    if (cleanedPageLines.length > 0) {
      nonEmptyPages.push(cleanedPageLines.join('\n'));
    }
  }

  return {
    fullText: nonEmptyPages.join('\n--- [PAGE_BREAK] ---\n'),
    pageCount: Math.max(1, nonEmptyPages.length),
    lines: allLines,
  };
}

/**
 * Extracts text from a .docx buffer on the server by inflating word/document.xml
 */
function extractDocxOnServer(buffer: Buffer): string {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
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
    const fileName = Buffer.from(bytes.subarray(nameStart, nameStart + fileNameLen)).toString('utf8');
    const dataStart = nameStart + fileNameLen + extraLen;

    if (fileName === 'word/document.xml') {
      let xmlContent = '';
      if (compressionMethod === 0) {
        xmlContent = Buffer.from(bytes.subarray(dataStart, dataStart + compressedSize)).toString('utf8');
      } else if (compressionMethod === 8) {
        // Find next PK header if compressedSize is 0 (data descriptor bit 3)
        let actualEnd = dataStart + compressedSize;
        if (compressedSize === 0) {
          actualEnd = bytes.length;
          for (let j = dataStart; j < bytes.length - 4; j++) {
            if (
              bytes[j] === 0x50 &&
              bytes[j + 1] === 0x4b &&
              (bytes[j + 2] === 0x03 || bytes[j + 2] === 0x01 || bytes[j + 2] === 0x07)
            ) {
              actualEnd = j;
              break;
            }
          }
        }
        const inflated = zlib.inflateRawSync(Buffer.from(bytes.subarray(dataStart, actualEnd)));
        xmlContent = inflated.toString('utf8');
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
    }

    offset = dataStart + Math.max(compressedSize, 1);
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { base64Data, fileName = '' } = body as {
      base64Data?: string;
      fileName?: string;
    };

    if (!base64Data) {
      return NextResponse.json({ error: 'Missing base64Data' }, { status: 400 });
    }

    const rawBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(rawBase64, 'base64');
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.docx')) {
      const text = extractDocxOnServer(buffer);
      const lines = text.split('\n').filter(Boolean);
      return NextResponse.json({
        fullText: text,
        pageCount: 1,
        lines,
      });
    }

    // Default to PDF extraction via Mozilla PDF.js (unpdf)
    const result = await extractPdfWithCoordinates(new Uint8Array(buffer));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Extraction failed',
        fullText: '',
        pageCount: 1,
        lines: [],
      },
      { status: 200 }
    );
  }
}
