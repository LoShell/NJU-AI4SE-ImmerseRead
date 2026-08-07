import type { ReadingProgress, Segment } from "../domain/models";

export type SpoilerRisk = "low" | "high";

export interface BuildAllowedContextInput {
  segments: Segment[];
  progress: ReadingProgress;
  question: string;
  selectedText?: string;
  annotationNote?: string;
  maxChars?: number;
}

export interface AllowedContext {
  text: string;
  contextStartChar: number;
  contextEndChar: number;
  spoilerRisk: SpoilerRisk;
  instruction: string;
}

const DEFAULT_MAX_CHARS = 6000;
const SPOILER_SAFE_INSTRUCTION =
  "只能基于已读内容回答；不要暗示、确认或引用未读剧情。";

const FUTURE_ORIENTED_KEYWORDS = [
  "后来",
  "结局",
  "真相",
  "凶手",
  "最终",
  "boss",
  "背叛",
  "死了吗",
  "是不是反派",
  "会不会",
  "之后"
];

interface ContextPart {
  text: string;
  startChar: number;
  endChar: number;
}

export function buildAllowedContext(input: BuildAllowedContextInput): AllowedContext {
  const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;
  const sortedSegments = [...input.segments].sort((a, b) => a.startChar - b.startChar);
  const contextParts = buildReadSoFarParts(sortedSegments, input.progress);
  const trimmed = trimContextParts(contextParts, maxChars);
  const readContext = trimmed.map((part) => part.text).join("");
  const metadata = buildMetadata(input.selectedText, input.annotationNote);

  return {
    text: metadata.length > 0 ? `${metadata.join("\n")}\n\n${readContext}` : readContext,
    contextStartChar: trimmed[0]?.startChar ?? input.progress.absoluteCharOffset,
    contextEndChar: trimmed[trimmed.length - 1]?.endChar ?? input.progress.absoluteCharOffset,
    spoilerRisk: isFutureOriented(input.question) ? "high" : "low",
    instruction: SPOILER_SAFE_INSTRUCTION
  };
}

function buildReadSoFarParts(segments: Segment[], progress: ReadingProgress): ContextPart[] {
  return segments.flatMap((segment) => {
    const allowedEndChar = getAllowedEndChar(segment, progress);

    if (allowedEndChar <= segment.startChar) {
      return [];
    }

    return [
      {
        text: segment.text.slice(0, allowedEndChar - segment.startChar),
        startChar: segment.startChar,
        endChar: allowedEndChar
      }
    ];
  });
}

function getAllowedEndChar(segment: Segment, progress: ReadingProgress): number {
  const absoluteLimit = Math.min(segment.endChar, progress.absoluteCharOffset);

  if (segment.id !== progress.segmentId) {
    return absoluteLimit;
  }

  const segmentLimit = segment.startChar + progress.charOffsetInSegment;
  return Math.min(absoluteLimit, segmentLimit);
}

function trimContextParts(parts: ContextPart[], maxChars: number): ContextPart[] {
  let remaining = Math.max(0, maxChars);
  const trimmed: ContextPart[] = [];

  for (let index = parts.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const part = parts[index];

    if (part.text.length <= remaining) {
      trimmed.unshift(part);
      remaining -= part.text.length;
      continue;
    }

    const startOffset = part.text.length - remaining;
    trimmed.unshift({
      text: part.text.slice(startOffset),
      startChar: part.startChar + startOffset,
      endChar: part.endChar
    });
    remaining = 0;
  }

  return trimmed;
}

function buildMetadata(selectedText?: string, annotationNote?: string): string[] {
  return [
    selectedText ? `Selected text: ${selectedText}` : undefined,
    annotationNote ? `Annotation note: ${annotationNote}` : undefined
  ].filter((line): line is string => line !== undefined);
}

function isFutureOriented(question: string): boolean {
  const normalizedQuestion = question.toLocaleLowerCase();
  return FUTURE_ORIENTED_KEYWORDS.some((keyword) =>
    normalizedQuestion.includes(keyword.toLocaleLowerCase())
  );
}
