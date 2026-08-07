import { describe, expect, it } from "vitest";
import type { AtmosphereProfile, BgmTrack } from "./bgmTypes";
import { recommendBgm } from "./bgmMatcher";

const baseProfile: AtmosphereProfile = {
  segmentId: "segment-1",
  moods: ["suspense", "lonely"],
  scenes: ["night", "corridor"],
  pace: "slow",
  intensity: 6,
  energy: 4,
  darkness: 8,
  warmth: 2,
  tags: ["suspense", "night", "corridor"],
  createdAt: "2026-08-07T00:00:00.000Z"
};

const makeTrack = (overrides: Partial<BgmTrack>): BgmTrack => ({
  id: overrides.id ?? "track-1",
  title: overrides.title ?? "Track",
  source: overrides.source ?? "built-in",
  fileRef: overrides.fileRef,
  moods: overrides.moods ?? [],
  scenes: overrides.scenes ?? [],
  energy: overrides.energy ?? 0,
  darkness: overrides.darkness ?? 0,
  warmth: overrides.warmth ?? 0,
  tempo: overrides.tempo ?? "medium",
  licenseNote: overrides.licenseNote,
  createdAt: overrides.createdAt ?? "2026-08-07T00:00:00.000Z"
});

describe("recommendBgm", () => {
  it("ranks tracks by mood, scene, tempo, and numeric similarity", () => {
    const recommendations = recommendBgm(baseProfile, [
      makeTrack({
        id: "numeric-close",
        title: "Numeric Close",
        moods: ["suspense"],
        scenes: ["night"],
        energy: 4,
        darkness: 8,
        warmth: 2,
        tempo: "slow"
      }),
      makeTrack({
        id: "more-tags-but-distant",
        title: "More Tags But Distant",
        moods: ["suspense", "lonely"],
        scenes: ["night", "corridor"],
        energy: 9,
        darkness: 1,
        warmth: 9,
        tempo: "fast"
      }),
      makeTrack({
        id: "scene-only",
        title: "Scene Only",
        moods: [],
        scenes: ["night"],
        energy: 4,
        darkness: 8,
        warmth: 2,
        tempo: "slow"
      })
    ]);

    expect(recommendations.map((recommendation) => recommendation.trackId)).toEqual([
      "numeric-close",
      "more-tags-but-distant",
      "scene-only"
    ]);
    expect(recommendations[0]).toMatchObject({
      title: "Numeric Close",
      score: 6
    });
    expect(recommendations[0].reason).toContain("suspense");
  });

  it("returns no recommendations when a track is locked", () => {
    const recommendations = recommendBgm(
      baseProfile,
      [makeTrack({ id: "locked", title: "Locked", moods: ["suspense"], scenes: ["night"], tempo: "slow" })],
      { lockedTrackId: "locked" }
    );

    expect(recommendations).toEqual([]);
  });

  it("returns at most three positive-score recommendations", () => {
    const recommendations = recommendBgm(baseProfile, [
      makeTrack({ id: "first", title: "First", moods: ["suspense"], tempo: "slow", energy: 4, darkness: 8, warmth: 2 }),
      makeTrack({ id: "second", title: "Second", moods: ["lonely"], tempo: "slow", energy: 4, darkness: 8, warmth: 2 }),
      makeTrack({ id: "third", title: "Third", scenes: ["night"], tempo: "slow", energy: 4, darkness: 8, warmth: 2 }),
      makeTrack({ id: "fourth", title: "Fourth", scenes: ["corridor"], tempo: "slow", energy: 4, darkness: 8, warmth: 2 })
    ]);

    expect(recommendations).toHaveLength(3);
    expect(recommendations.every((recommendation) => recommendation.score > 0)).toBe(true);
  });

  it("excludes tracks with non-positive scores", () => {
    const recommendations = recommendBgm(baseProfile, [
      makeTrack({
        id: "no-match",
        title: "No Match",
        moods: ["joy"],
        scenes: ["market"],
        energy: 9,
        darkness: 0,
        warmth: 9,
        tempo: "fast"
      }),
      makeTrack({
        id: "zero-score",
        title: "Zero Score",
        moods: ["suspense"],
        scenes: [],
        energy: 7,
        darkness: 8,
        warmth: 2,
        tempo: "medium"
      }),
      makeTrack({
        id: "positive",
        title: "Positive",
        moods: ["suspense"],
        scenes: [],
        energy: 4,
        darkness: 8,
        warmth: 2,
        tempo: "slow"
      })
    ]);

    expect(recommendations.map((recommendation) => recommendation.trackId)).toEqual(["positive"]);
  });
});
