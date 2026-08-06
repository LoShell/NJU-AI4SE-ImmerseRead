export type SegmentType = "chapter" | "chunk";
export type ParseConfidence = "high" | "medium" | "low";
export type AtmosphereStatus = "pending" | "ready" | "failed";
export type ChatRole = "user" | "assistant";
export type SpoilerPolicy = "strict";
export type BgmSource = "built-in" | "user-uploaded";
export type Tempo = "slow" | "medium" | "fast";

export interface Book {
  id: string;
  title: string;
  author?: string;
  sourceFileName: string;
  createdAt: string;
  updatedAt: string;
  totalChars: number;
  parserVersion: string;
}

export interface Segment {
  id: string;
  bookId: string;
  index: number;
  title: string;
  startChar: number;
  endChar: number;
  text: string;
  type: SegmentType;
  parseConfidence: ParseConfidence;
  atmosphereStatus: AtmosphereStatus;
}

export interface ReadingProgress {
  bookId: string;
  segmentId: string;
  charOffsetInSegment: number;
  absoluteCharOffset: number;
  updatedAt: string;
}

export interface Annotation {
  id: string;
  bookId: string;
  segmentId: string;
  startChar: number;
  endChar: number;
  selectedText: string;
  note: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  bookId: string;
  segmentId: string;
  role: ChatRole;
  content: string;
  selectedText?: string;
  annotationId?: string;
  contextStartChar: number;
  contextEndChar: number;
  spoilerPolicy: SpoilerPolicy;
  createdAt: string;
}

export interface AtmosphereProfile {
  segmentId: string;
  moods: string[];
  scenes: string[];
  pace: Tempo;
  intensity: number;
  energy: number;
  darkness: number;
  warmth: number;
  tags: string[];
  chapterEndPrompt?: string;
  modelName?: string;
  createdAt: string;
}

export interface BgmTrack {
  id: string;
  title: string;
  source: BgmSource;
  fileRef?: string;
  moods: string[];
  scenes: string[];
  energy: number;
  darkness: number;
  warmth: number;
  tempo: Tempo;
  licenseNote?: string;
  createdAt: string;
}
