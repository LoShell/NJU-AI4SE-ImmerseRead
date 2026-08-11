import { describe, expect, it } from "vitest";
import type { AtmosphereProfile, BgmTrack } from "./bgmTypes";
import { recommendBgm } from "./bgmMatcher";

const baseProfile: AtmosphereProfile = {
  segmentId: "segment-1",
  moods: ["悬疑", "孤独"],
  scenes: ["夜晚", "走廊"],
  pace: "slow",
  intensity: 0.6,
  energy: 0.4,
  darkness: 0.8,
  warmth: 0.2,
  tags: ["悬疑", "夜晚", "走廊"],
  createdAt: "2026-08-07T00:00:00.000Z"
};

const makeTrack = (overrides: Partial<BgmTrack>): BgmTrack => ({
  id: overrides.id ?? "track-1",
  title: overrides.title ?? "Track",
  source: overrides.source ?? "built-in",
  fileRef: overrides.fileRef,
  genres: (overrides as Partial<BgmTrack> & { genres?: string[] }).genres ?? [],
  moods: overrides.moods ?? [],
  scenes: overrides.scenes ?? [],
  energy: overrides.energy ?? 0,
  darkness: overrides.darkness ?? 0,
  warmth: overrides.warmth ?? 0,
  tempo: overrides.tempo ?? "medium",
  complexity: (overrides as Partial<BgmTrack> & { complexity?: string }).complexity ?? "ambient",
  licenseNote: overrides.licenseNote,
  createdAt: overrides.createdAt ?? "2026-08-07T00:00:00.000Z"
});

describe("recommendBgm", () => {
  it("ranks tracks by mood, scene, tempo, and numeric similarity", () => {
    const recommendations = recommendBgm(baseProfile, [
      makeTrack({
        id: "numeric-close",
        title: "数值贴近",
        moods: ["悬疑"],
        scenes: ["夜晚"],
        energy: 0.4,
        darkness: 0.8,
        warmth: 0.2,
        tempo: "slow"
      }),
      makeTrack({
        id: "more-tags-but-distant",
        title: "标签更多但数值偏远",
        moods: ["悬疑", "孤独"],
        scenes: ["夜晚", "走廊"],
        energy: 1,
        darkness: 0,
        warmth: 1,
        tempo: "fast"
      }),
      makeTrack({
        id: "scene-only",
        title: "只有场景",
        moods: [],
        scenes: ["夜晚"],
        energy: 0.4,
        darkness: 0.8,
        warmth: 0.2,
        tempo: "slow"
      })
    ]);

    expect(recommendations.map((recommendation) => recommendation.trackId)).toEqual([
      "more-tags-but-distant",
      "numeric-close"
    ]);
    expect(recommendations[0]).toMatchObject({
      title: "标签更多但数值偏远"
    });
    expect(recommendations[0].score).toBeCloseTo(7.8);
    expect(recommendations[0].reason).toBe("匹配情绪：悬疑。");
  });

  it("returns no recommendations when a track is locked", () => {
    const recommendations = recommendBgm(
      baseProfile,
      [makeTrack({ id: "locked", title: "Locked", moods: ["悬疑"], scenes: ["夜晚"], tempo: "slow" })],
      { lockedTrackId: "locked" }
    );

    expect(recommendations).toEqual([]);
  });

  it("prioritizes book genre over a momentary mood-only match", () => {
    const recommendations = recommendBgm(
      baseProfile,
      [
        makeTrack({
          id: "romance-mood",
          title: "恋爱甜歌",
          genres: ["甜宠"],
          moods: ["悬疑", "孤独"],
          scenes: ["夜晚", "走廊"],
          energy: 0.4,
          darkness: 0.8,
          warmth: 0.2,
          tempo: "slow",
          complexity: "ambient"
        } as Partial<BgmTrack>),
        makeTrack({
          id: "suspense-theme",
          title: "悬疑底色",
          genres: ["悬疑"],
          moods: ["紧张"],
          scenes: ["谜团"],
          energy: 0.5,
          darkness: 0.7,
          warmth: 0.2,
          tempo: "slow",
          complexity: "layered"
        } as Partial<BgmTrack>)
      ],
      { bookGenre: "悬疑" } as never
    );

    expect(recommendations[0]).toMatchObject({
      trackId: "suspense-theme",
      reason: expect.stringContaining("题材：悬疑")
    });
  });

  it("returns at most two positive-score recommendations", () => {
    const recommendations = recommendBgm(baseProfile, [
      makeTrack({ id: "first", title: "First", moods: ["悬疑"], tempo: "slow", energy: 0.4, darkness: 0.8, warmth: 0.2 }),
      makeTrack({ id: "second", title: "Second", moods: ["孤独"], tempo: "slow", energy: 0.4, darkness: 0.8, warmth: 0.2 }),
      makeTrack({ id: "third", title: "Third", scenes: ["夜晚"], tempo: "slow", energy: 0.4, darkness: 0.8, warmth: 0.2 }),
      makeTrack({ id: "fourth", title: "Fourth", scenes: ["走廊"], tempo: "slow", energy: 0.4, darkness: 0.8, warmth: 0.2 })
    ]);

    expect(recommendations).toHaveLength(2);
    expect(recommendations.every((recommendation) => recommendation.score > 0)).toBe(true);
  });

  it("excludes tracks with non-positive scores", () => {
    const recommendations = recommendBgm(baseProfile, [
      makeTrack({
        id: "no-match",
        title: "No Match",
        moods: ["欢乐"],
        scenes: ["集市"],
        energy: 1,
        darkness: 0,
        warmth: 1,
        tempo: "fast"
      }),
      makeTrack({
        id: "zero-score",
        title: "Zero Score",
        moods: [],
        scenes: [],
        energy: 0.4,
        darkness: 0.8,
        warmth: 0.2,
        tempo: "medium"
      }),
      makeTrack({
        id: "positive",
        title: "Positive",
        moods: ["悬疑"],
        scenes: [],
        energy: 0.4,
        darkness: 0.8,
        warmth: 0.2,
        tempo: "slow"
      })
    ]);

    expect(recommendations.map((recommendation) => recommendation.trackId)).toEqual(["positive"]);
  });
});
