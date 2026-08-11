import type { AtmosphereProfile, BgmComplexity, BgmRecommendation, BgmTrack, RecommendOptions } from "./bgmTypes";

const countOverlap = (left: string[], right: string[]): number => {
  const rightTags = new Set(right);
  return left.filter((tag) => rightTags.has(tag)).length;
};

const findFirstOverlap = (left: string[], right: string[]): string | undefined => {
  const rightTags = new Set(right);
  return left.find((tag) => rightTags.has(tag));
};

const expectedComplexity = (profile: AtmosphereProfile): BgmComplexity => {
  if (profile.intensity >= 0.78 || profile.energy >= 0.85) {
    return "cinematic";
  }

  if (profile.intensity >= 0.45 || profile.darkness >= 0.65) {
    return "layered";
  }

  return "ambient";
};

const complexityScore = (profile: AtmosphereProfile, track: BgmTrack): number => {
  if (!track.complexity) {
    return 0;
  }

  return track.complexity === expectedComplexity(profile) ? 1.5 : 0;
};

const buildReason = (profile: AtmosphereProfile, track: BgmTrack, options?: RecommendOptions): string => {
  if (options?.bookGenre && track.genres?.includes(options.bookGenre)) {
    return `匹配作品题材：${options.bookGenre}。`;
  }

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

const scoreTrack = (profile: AtmosphereProfile, track: BgmTrack, options?: RecommendOptions): number => {
  const genreScore = options?.bookGenre && track.genres?.includes(options.bookGenre) ? 12 : 0;
  const moodScore = countOverlap(track.moods, profile.moods) * 3;
  const sceneScore = countOverlap(track.scenes, profile.scenes) * 2;
  const tempoScore = track.tempo === profile.pace ? 1 : 0;
  const numericDistance =
    Math.abs(track.energy - profile.energy) +
    Math.abs(track.darkness - profile.darkness) +
    Math.abs(track.warmth - profile.warmth);

  return genreScore + moodScore + sceneScore + tempoScore + complexityScore(profile, track) - numericDistance;
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
      score: scoreTrack(profile, track, options),
      reason: buildReason(profile, track, options)
    }))
    .filter((recommendation) => recommendation.score > 0)
    .sort((left, right) => right.score - left.score || left.trackId.localeCompare(right.trackId))
    .slice(0, 2);
}
