import type { BgmTrack } from "./bgmTypes";

export const builtInTracks: BgmTrack[] = [
  {
    id: "night-suspense",
    title: "Night Suspense",
    source: "built-in",
    moods: ["suspense", "tense", "lonely"],
    scenes: ["night", "mystery", "corridor"],
    energy: 4,
    darkness: 8,
    warmth: 2,
    tempo: "slow",
    licenseNote: "Metadata placeholder only. No bundled audio file.",
    createdAt: "2026-08-07T00:00:00.000Z"
  },
  {
    id: "battle-rise",
    title: "Battle Rise",
    source: "built-in",
    moods: ["battle", "heroic", "fiery"],
    scenes: ["fight", "chase", "climax"],
    energy: 9,
    darkness: 5,
    warmth: 4,
    tempo: "fast",
    licenseNote: "Metadata placeholder only. No bundled audio file.",
    createdAt: "2026-08-07T00:00:00.000Z"
  },
  {
    id: "daily-warm",
    title: "Daily Warm",
    source: "built-in",
    moods: ["daily", "relaxed", "warm"],
    scenes: ["home", "daytime", "conversation"],
    energy: 3,
    darkness: 1,
    warmth: 9,
    tempo: "medium",
    licenseNote: "Metadata placeholder only. No bundled audio file.",
    createdAt: "2026-08-07T00:00:00.000Z"
  },
  {
    id: "sad-memory",
    title: "Sad Memory",
    source: "built-in",
    moods: ["sad", "nostalgic", "melancholy"],
    scenes: ["memory", "farewell", "rain"],
    energy: 2,
    darkness: 6,
    warmth: 3,
    tempo: "slow",
    licenseNote: "Metadata placeholder only. No bundled audio file.",
    createdAt: "2026-08-07T00:00:00.000Z"
  }
];
