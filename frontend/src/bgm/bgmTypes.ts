export type Tempo = "slow" | "medium" | "fast";
export type BgmSource = "built-in" | "user-uploaded";
export type BgmComplexity = "minimal" | "ambient" | "layered" | "cinematic";
export type BgmPlaybackMode = "list" | "repeat-one";

export interface BgmTrack {
  id: string;
  title: string;
  source: BgmSource;
  fileRef?: string;
  audioBlob?: Blob;
  genres?: string[];
  moods: string[];
  scenes: string[];
  energy: number;
  darkness: number;
  warmth: number;
  tempo: Tempo;
  complexity?: BgmComplexity;
  licenseNote?: string;
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

export interface RecommendOptions {
  lockedTrackId?: string;
  bookGenre?: string;
}

export interface BgmRecommendation {
  trackId: string;
  title: string;
  score: number;
  reason: string;
}
