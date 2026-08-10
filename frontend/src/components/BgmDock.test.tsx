import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { BgmRecommendation, BgmTrack } from "../bgm/bgmTypes";
import { BgmDock } from "./BgmDock";

const tracks: BgmTrack[] = [
  {
    id: "night-suspense",
    title: "夜色疑云",
    source: "built-in",
    moods: ["悬疑"],
    scenes: ["夜晚"],
    energy: 0.4,
    darkness: 0.8,
    warmth: 0.2,
    tempo: "slow",
    createdAt: "2026-08-07T00:00:00.000Z"
  }
];

const uploadedTracks: BgmTrack[] = [
  ...tracks,
  {
    id: "local-rain",
    title: "本地雨声",
    source: "user-uploaded",
    fileRef: "blob:local-rain",
    moods: ["安静"],
    scenes: ["雨"],
    energy: 0.2,
    darkness: 0.4,
    warmth: 0.3,
    tempo: "slow",
    createdAt: "2026-08-07T01:00:00.000Z"
  }
];

const recommendations: BgmRecommendation[] = [
  {
    trackId: "night-suspense",
    title: "夜色疑云",
    score: 8,
    reason: "匹配当前悬疑氛围。"
  }
];

describe("BgmDock", () => {
  it("renders a compact player card with the default BGM cover", () => {
    renderDock({ tracks: uploadedTracks });

    expect(screen.getByAltText("默认 BGM 封面")).toBeInTheDocument();
    expect(screen.getByText("氛围推荐")).toBeInTheDocument();
    expect(screen.getByText("我的曲库")).toBeInTheDocument();
    expect(screen.getByText("添加本地音频")).toBeInTheDocument();
  });

  it("requires confirmation before switching to a recommended track", () => {
    const onConfirmSwitch = vi.fn();

    renderDock({ onConfirmSwitch });

    fireEvent.click(screen.getByRole("button", { name: "切换到 夜色疑云" }));
    expect(screen.getByText("确认切换到「夜色疑云」？")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认切换" }));

    expect(onConfirmSwitch).toHaveBeenCalledWith("night-suspense");
  });

  it("shows current playback controls and exposes the lock action", () => {
    const onToggleLock = vi.fn();
    const onTogglePlay = vi.fn();

    renderDock({
      currentTrackId: "night-suspense",
      isPlaying: true,
      onToggleLock,
      onTogglePlay
    });

    const dock = screen.getByLabelText("BGM 播放与推荐");
    expect(within(dock).getAllByText("夜色疑云").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "暂停" }));
    fireEvent.click(screen.getByRole("button", { name: "锁定当前曲" }));

    expect(onTogglePlay).toHaveBeenCalledOnce();
    expect(onToggleLock).toHaveBeenCalledOnce();
  });

  it("submits local audio metadata without uploading the audio to the backend", () => {
    const onUploadTrack = vi.fn();
    const file = new File(["fake audio"], "rain.mp3", { type: "audio/mpeg" });

    renderDock({ recommendations: [], onUploadTrack });

    fireEvent.change(screen.getByLabelText("音频文件"), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("曲名"), { target: { value: "雨夜" } });
    fireEvent.change(screen.getByLabelText("情绪标签"), { target: { value: "悬疑,安静" } });
    fireEvent.change(screen.getByLabelText("场景标签"), { target: { value: "雨 夜晚" } });
    fireEvent.click(screen.getByRole("button", { name: "保存本地音频" }));

    expect(onUploadTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        file,
        title: "雨夜",
        moods: ["悬疑", "安静"],
        scenes: ["雨", "夜晚"],
        source: "user-uploaded"
      })
    );
  });

  it("renders an audio player for uploaded tracks with a local file reference", () => {
    renderDock({
      tracks: uploadedTracks,
      currentTrackId: "local-rain",
      recommendations: []
    });

    expect(screen.getByLabelText("本地音频播放器")).toHaveAttribute("src", "blob:local-rain");
  });

  it("shows uploaded tracks in my library and allows selecting or deleting them", () => {
    const onConfirmSwitch = vi.fn();
    const onDeleteTrack = vi.fn();

    renderDock({
      tracks: uploadedTracks,
      recommendations: [],
      onConfirmSwitch,
      onDeleteTrack
    });

    const library = screen.getByLabelText("我的 BGM 曲库");
    expect(within(library).getByText("本地雨声")).toBeInTheDocument();
    expect(within(library).getByText("安静 / 雨")).toBeInTheDocument();

    fireEvent.click(within(library).getByRole("button", { name: "设为当前 本地雨声" }));
    fireEvent.click(within(library).getByRole("button", { name: "删除 本地雨声" }));

    expect(onConfirmSwitch).toHaveBeenCalledWith("local-rain");
    expect(onDeleteTrack).toHaveBeenCalledWith("local-rain");
  });
});

function renderDock(overrides: Partial<ComponentProps<typeof BgmDock>> = {}) {
  return render(
    <BgmDock
      currentTrackId={undefined}
      isAnalyzing={false}
      isPlaying={false}
      lockedTrackId={undefined}
      onAnalyze={vi.fn()}
      onConfirmSwitch={vi.fn()}
      onDeleteTrack={vi.fn()}
      onToggleLock={vi.fn()}
      onTogglePlay={vi.fn()}
      onUploadTrack={vi.fn()}
      recommendations={recommendations}
      tracks={tracks}
      {...overrides}
    />
  );
}
