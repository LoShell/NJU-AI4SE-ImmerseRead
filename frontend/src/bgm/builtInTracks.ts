import type { BgmTrack } from "./bgmTypes";

const PLACEHOLDER_LICENSE = "Metadata placeholder only. No bundled audio file.";

export const builtInTracks: BgmTrack[] = [
  {
    id: "night-suspense",
    title: "夜色疑云",
    source: "built-in",
    moods: ["悬疑", "紧张", "孤独"],
    scenes: ["夜晚", "谜团", "走廊"],
    energy: 0.4,
    darkness: 0.85,
    warmth: 0.2,
    tempo: "slow",
    licenseNote: PLACEHOLDER_LICENSE,
    createdAt: "2026-08-07T00:00:00.000Z"
  },
  {
    id: "battle-rise",
    title: "战意渐燃",
    source: "built-in",
    moods: ["战斗", "热血", "紧张"],
    scenes: ["战斗", "追逐", "高潮"],
    energy: 0.9,
    darkness: 0.5,
    warmth: 0.4,
    tempo: "fast",
    licenseNote: PLACEHOLDER_LICENSE,
    createdAt: "2026-08-07T00:00:00.000Z"
  },
  {
    id: "daily-warm",
    title: "午后日常",
    source: "built-in",
    moods: ["日常", "轻松", "温暖"],
    scenes: ["家", "白天", "对话"],
    energy: 0.3,
    darkness: 0.1,
    warmth: 0.9,
    tempo: "medium",
    licenseNote: PLACEHOLDER_LICENSE,
    createdAt: "2026-08-07T00:00:00.000Z"
  },
  {
    id: "sad-memory",
    title: "旧梦微雨",
    source: "built-in",
    moods: ["回忆", "伤感", "怅然"],
    scenes: ["回忆", "离别", "雨"],
    energy: 0.2,
    darkness: 0.6,
    warmth: 0.3,
    tempo: "slow",
    licenseNote: PLACEHOLDER_LICENSE,
    createdAt: "2026-08-07T00:00:00.000Z"
  }
];
