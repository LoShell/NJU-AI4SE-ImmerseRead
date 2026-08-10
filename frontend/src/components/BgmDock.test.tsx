import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

const twoUploadedTracks: BgmTrack[] = [
  ...uploadedTracks,
  {
    id: "local-wind",
    title: "本地风声",
    source: "user-uploaded",
    fileRef: "blob:local-wind",
    moods: ["孤独"],
    scenes: ["荒原"],
    energy: 0.3,
    darkness: 0.5,
    warmth: 0.2,
    tempo: "slow",
    createdAt: "2026-08-07T02:00:00.000Z"
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
  beforeEach(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn(async () => undefined)
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: vi.fn()
    });
  });

  it("renders a compact player card with the default BGM cover", () => {
    renderDock({ tracks: uploadedTracks });

    expect(screen.getByAltText("默认 BGM 封面")).toBeInTheDocument();
    expect(screen.getByText("氛围推荐")).toBeInTheDocument();
    expect(screen.getByText("我的曲库")).toBeInTheDocument();
    expect(screen.getByText("添加本地音频")).toBeInTheDocument();
  });

  it("disables player controls until a playable uploaded track is selected", () => {
    renderDock({ tracks });

    expect(screen.getByRole("button", { name: "播放" })).toBeDisabled();
    expect(screen.getByText("先在曲库中播放一首本地音频。")).toBeInTheDocument();
  });

  it("uses the custom player button for uploaded audio without showing native controls", () => {
    const onTogglePlay = vi.fn();

    renderDock({
      tracks: uploadedTracks,
      currentTrackId: "local-rain",
      onTogglePlay
    });

    fireEvent.click(screen.getByRole("button", { name: "播放" }));

    expect(onTogglePlay).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("本地音频播放器")).toHaveAttribute("src", "blob:local-rain");
    expect(screen.getByLabelText("本地音频播放器")).not.toHaveAttribute("controls");
  });

  it("drives the hidden audio element from the custom play state", () => {
    const { rerender } = renderDock({
      tracks: uploadedTracks,
      currentTrackId: "local-rain"
    });

    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();

    rerender(
      <BgmDock
        currentTrackId="local-rain"
        isAnalyzing={false}
        isPlaying
        lockedTrackId={undefined}
        onAnalyze={vi.fn()}
        onConfirmSwitch={vi.fn()}
        onDeleteTrack={vi.fn()}
        onToggleLock={vi.fn()}
        onTogglePlay={vi.fn()}
        onUploadTrack={vi.fn()}
        recommendations={recommendations}
        tracks={uploadedTracks}
      />
    );

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it("switches playable uploaded tracks in list order and skips missing built-in audio", () => {
    const onConfirmSwitch = vi.fn();

    renderDock({
      tracks: twoUploadedTracks,
      currentTrackId: "local-rain",
      onConfirmSwitch
    });

    fireEvent.click(screen.getByRole("button", { name: "下一首" }));
    fireEvent.click(screen.getByRole("button", { name: "上一首" }));

    expect(onConfirmSwitch).toHaveBeenNthCalledWith(1, "local-wind");
    expect(onConfirmSwitch).toHaveBeenNthCalledWith(2, "local-wind");
  });

  it("continues to the next playable track when the current local audio ends", () => {
    const onConfirmSwitch = vi.fn();

    renderDock({
      tracks: twoUploadedTracks,
      currentTrackId: "local-rain",
      onConfirmSwitch
    });

    fireEvent.ended(screen.getByLabelText("本地音频播放器"));

    expect(onConfirmSwitch).toHaveBeenCalledWith("local-wind");
  });

  it("requires confirmation before switching to a recommended track", () => {
    const onConfirmSwitch = vi.fn();

    renderDock({ onConfirmSwitch });

    fireEvent.click(screen.getByRole("button", { name: "切换到 夜色疑云" }));
    expect(screen.getByText("确认切换到「夜色疑云」？")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认切换" }));

    expect(onConfirmSwitch).toHaveBeenCalledWith("night-suspense");
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

  it("shows uploaded tracks in my library and allows playing or deleting them", () => {
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

    const missingAudioButton = within(library).getByRole("button", { name: "缺少音频 夜色疑云" });
    expect(missingAudioButton).toBeDisabled();
    expect(missingAudioButton).toHaveClass("button-icon-only");
    fireEvent.click(within(library).getByRole("button", { name: "播放 本地雨声" }));
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
