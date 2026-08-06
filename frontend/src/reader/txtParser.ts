import type { Book, Segment } from "../domain/models";

export interface ParseTxtBookInput {
  fileName: string;
  text: string;
  chunkSize?: number;
}

export interface ParsedBook {
  book: Book;
  segments: Segment[];
}

const PARSER_VERSION = "txt-v1";
const DEFAULT_CHUNK_SIZE = 4000;

const CHAPTER_PATTERNS = [
  /^绗.+?[绔犺妭].*$/,
  /^绗.*?鑺?.*$/,
  /^鍗.+$/,
  /^Chapter\s+\d+.*$/i,
  /^\d+(?:[.銆乚]|\s+).+$/
];

export function parseTxtBook(input: ParseTxtBookInput): ParsedBook {
  const bookId = crypto.randomUUID();
  const now = new Date().toISOString();
  const book: Book = {
    id: bookId,
    title: titleFromFileName(input.fileName),
    sourceFileName: input.fileName,
    createdAt: now,
    updatedAt: now,
    totalChars: input.text.length,
    parserVersion: PARSER_VERSION
  };

  const headings = findChapterHeadings(input.text);
  const segments =
    headings.length >= 2
      ? createChapterSegments(input.text, headings, bookId)
      : createChunkSegments(input.text, input.chunkSize ?? DEFAULT_CHUNK_SIZE, bookId);

  return { book, segments };
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.txt$/i, "");
}

function findChapterHeadings(text: string): Array<{ index: number; title: string }> {
  const headings: Array<{ index: number; title: string }> = [];
  const linePattern = /^.*$/gm;
  let match: RegExpExecArray | null;

  while ((match = linePattern.exec(text)) !== null) {
    const line = match[0];
    if (line.trim() !== "" && CHAPTER_PATTERNS.some((pattern) => pattern.test(line.trim()))) {
      headings.push({ index: match.index, title: line.trim() });
    }

    if (match[0] === "") {
      linePattern.lastIndex += 1;
    }
  }

  return headings;
}

function createChapterSegments(
  text: string,
  headings: Array<{ index: number; title: string }>,
  bookId: string
): Segment[] {
  return headings.map((heading, index) => {
    const startChar = index === 0 ? 0 : heading.index;
    const endChar = headings[index + 1]?.index ?? text.length;

    return createSegment({
      bookId,
      index,
      title: heading.title,
      startChar,
      endChar,
      text,
      type: "chapter",
      parseConfidence: "high"
    });
  });
}

function createChunkSegments(text: string, chunkSize: number, bookId: string): Segment[] {
  const normalizedChunkSize = Math.max(1, chunkSize);
  const segments: Segment[] = [];
  let startChar = 0;

  if (text.length === 0) {
    return [
      createSegment({
        bookId,
        index: 0,
        title: "鐗囨 1",
        startChar: 0,
        endChar: 0,
        text,
        type: "chunk",
        parseConfidence: "low"
      })
    ];
  }

  while (startChar < text.length) {
    const targetEnd = Math.min(startChar + normalizedChunkSize, text.length);
    const endChar = targetEnd === text.length ? text.length : findChunkBoundary(text, startChar, targetEnd);

    segments.push(
      createSegment({
        bookId,
        index: segments.length,
        title: `鐗囨 ${segments.length + 1}`,
        startChar,
        endChar,
        text,
        type: "chunk",
        parseConfidence: "low"
      })
    );

    startChar = endChar;
  }

  return segments;
}

function findChunkBoundary(text: string, startChar: number, targetEnd: number): number {
  const paragraphBoundary = Math.max(
    text.lastIndexOf("\r\n\r\n", targetEnd),
    text.lastIndexOf("\n\n", targetEnd)
  );

  if (paragraphBoundary > startChar) {
    return paragraphBoundary + (text.startsWith("\r\n\r\n", paragraphBoundary) ? 4 : 2);
  }

  const lineBoundary = Math.max(text.lastIndexOf("\r\n", targetEnd), text.lastIndexOf("\n", targetEnd));
  if (lineBoundary > startChar) {
    return lineBoundary + (text.startsWith("\r\n", lineBoundary) ? 2 : 1);
  }

  return targetEnd;
}

function createSegment(input: {
  bookId: string;
  index: number;
  title: string;
  startChar: number;
  endChar: number;
  text: string;
  type: Segment["type"];
  parseConfidence: Segment["parseConfidence"];
}): Segment {
  return {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    index: input.index,
    title: input.title,
    startChar: input.startChar,
    endChar: input.endChar,
    text: input.text.slice(input.startChar, input.endChar),
    type: input.type,
    parseConfidence: input.parseConfidence,
    atmosphereStatus: "pending"
  };
}
