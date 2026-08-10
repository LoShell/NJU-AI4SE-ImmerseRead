import type { AtmosphereProfile, BgmRecommendation, BgmTrack, RecommendOptions } from "./bgmTypes";

const countOverlap = (left: string[], right: string[]): number => {
  const rightTags = new Set(right);
  return left.filter((tag) => rightTags.has(tag)).length;
};

const findFirstOverlap = (left: string[], right: string[]): string | undefined => {
  const rightTags = new Set(right);
  return left.find((tag) => rightTags.has(tag));
};

const buildReason = (profile: AtmosphereProfile, track: BgmTrack): string => {
  const matchedMood = findFirstOverlap(track.moods, profile.moods);
  if (matchedMood) {
    return `匹配情绪：${matchedMood}。`;
  }

  const matchedScene = findFirstOverlap(track.scenes, profile.scenes);
  if (matchedScene) {
    return `匹配场景：${matchedScene}。`;
  }

  return "整体氛围最接近当前片段。";
};

const scoreTrack = (profile: AtmosphereProfile, track: BgmTrack): number => {
  const moodScore = countOverlap(track.moods, profile.moods) * 3;
  const sceneScore = countOverlap(track.scenes, profile.scenes) * 2;
  const tempoScore = track.tempo === profile.pace ? 1 : 0;
  const numericDistance =
    Math.abs(track.energy - profile.energy) +
    Math.abs(track.darkness - profile.darkness) +
    Math.abs(track.warmth - profile.warmth);

  return moodScore + sceneScore + tempoScore - numericDistance;
};

export function recommendBgm(
  profile: AtmosphereProfile,
  tracks: BgmTrack[],
  options?: RecommendOptions
): BgmRecommendation[] {
  if (options?.lockedTrackId) {
    return [];
  }

  return tracks
    .map((track) => ({
      trackId: track.id,
      title: track.title,
      score: scoreTrack(profile, track),
      reason: buildReason(profile, track)
    }))
    .filter((recommendation) => recommendation.score > 0)
    .sort((left, right) => right.score - left.score || left.trackId.localeCompare(right.trackId))
    .slice(0, 3);
}
