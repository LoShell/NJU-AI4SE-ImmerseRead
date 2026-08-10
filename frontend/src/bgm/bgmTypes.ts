export type Tempo = "slow" | "medium" | "fast";
export type BgmSource = "built-in" | "user-uploaded";

export interface BgmTrack {
  id: string;
  title: string;
  source: BgmSource;
  fileRef?: string;
  audioBlob?: Blob;
  moods: string[];
  scenes: string[];
  energy: number;
  darkness: number;
  warmth: number;
  tempo: Tempo;
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
}

export interface BgmRecommendation {
  trackId: string;
  title: string;
  score: number;
  reason: string;
}
