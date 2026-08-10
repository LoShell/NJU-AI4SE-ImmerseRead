import { useMemo, useState, type FormEvent } from "react";
import type { BgmRecommendation, BgmSource, BgmTrack, Tempo } from "../bgm/bgmTypes";
import { Icon } from "./Icon";

export interface UploadedBgmInput {
  file: File;
  title: string;
  source: BgmSource;
  moods: string[];
  scenes: string[];
  energy: number;
  darkness: number;
  warmth: number;
  tempo: Tempo;
}

export interface BgmDockProps {
  tracks: BgmTrack[];
  recommendations: BgmRecommendation[];
  currentTrackId?: string;
  lockedTrackId?: string;
  isPlaying: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onConfirmSwitch: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onTogglePlay: () => void;
  onToggleLock: () => void;
  onUploadTrack: (track: UploadedBgmInput) => void;
}

const splitTags = (value: string): string[] =>
  value
    .split(/[,，、\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

const describeTrackTags = (track: BgmTrack): string => {
  const tags = [...track.moods, ...track.scenes];
  return tags.length > 0 ? tags.join(" / ") : "未填写标签";
};

export function BgmDock({
  tracks,
  recommendations,
  currentTrackId,
  lockedTrackId,
  isPlaying,
  isAnalyzing,
  onAnalyze,
  onConfirmSwitch,
  onDeleteTrack,
  onTogglePlay,
  onToggleLock,
  onUploadTrack
}: BgmDockProps) {
  const [pendingTrackId, setPendingTrackId] = useState<string>();
  const [file, setFile] = useState<File>();
  const [title, setTitle] = useState("");
  const [moods, setMoods] = useState("");
  const [scenes, setScenes] = useState("");
  const [energy, setEnergy] = useState(0.4);
  const [darkness, setDarkness] = useState(0.4);
  const [warmth, setWarmth] = useState(0.4);
  const [tempo, setTempo] = useState<Tempo>("medium");

  const currentTrack = useMemo(
    () => tracks.find((track) => track.id === currentTrackId),
    [currentTrackId, tracks]
  );
  const pendingTrack = useMemo(
    () => tracks.find((track) => track.id === pendingTrackId),
    [pendingTrackId, tracks]
  );

  function confirmSwitch() {
    if (!pendingTrackId) {
      return;
    }
    onConfirmSwitch(pendingTrackId);
    setPendingTrackId(undefined);
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      return;
    }

    const trimmedTitle = title.trim() || file.name.replace(/\.[^.]+$/, "");
    onUploadTrack({
      file,
      title: trimmedTitle,
      source: "user-uploaded",
      moods: splitTags(moods),
      scenes: splitTags(scenes),
      energy,
      darkness,
      warmth,
      tempo
    });
    setFile(undefined);
    setTitle("");
    setMoods("");
    setScenes("");
    setEnergy(0.4);
    setDarkness(0.4);
    setWarmth(0.4);
    setTempo("medium");
    event.currentTarget.reset();
  }

  return (
    <section className="bgm-dock" aria-label="BGM 播放与推荐">
      <details className="panel-section" open>
        <summary>
          <span><Icon name="play" />当前播放</span>
          <Icon name="chevron" />
        </summary>
        <div className="section-body bgm-now">
          <h3>{currentTrack?.title ?? "尚未选择曲目"}</h3>
          {currentTrack?.licenseNote && <p>{currentTrack.licenseNote}</p>}
          {currentTrack?.fileRef && (
            <audio aria-label="本地音频播放器" className="bgm-audio" controls src={currentTrack.fileRef} />
          )}
          <div className="bgm-actions">
            <button className="button-secondary" type="button" onClick={onTogglePlay} disabled={!currentTrack}>
              <Icon name={isPlaying ? "pause" : "play"} />
              {isPlaying ? "暂停" : "播放"}
            </button>
            <button className="button-secondary" type="button" onClick={onToggleLock} disabled={!currentTrack}>
              {lockedTrackId ? "解除锁定" : "锁定当前曲"}
            </button>
          </div>
        </div>
      </details>

      <details className="panel-section" open>
        <summary>
          <span><Icon name="music" />氛围推荐</span>
          <Icon name="chevron" />
        </summary>
        <div className="section-body bgm-recommendations">
          <button className="button-primary" type="button" onClick={onAnalyze} disabled={isAnalyzing}>
            <Icon name="settings" />
            {isAnalyzing ? "分析中..." : "分析当前氛围"}
          </button>
          {lockedTrackId ? (
            <p>当前曲目已锁定，暂不自动推荐切换。</p>
          ) : recommendations.length > 0 ? (
            recommendations.map((recommendation) => (
              <article className="bgm-recommendation" key={recommendation.trackId}>
                <div>
                  <strong>{recommendation.title}</strong>
                  <p>{recommendation.reason}</p>
                </div>
                <button className="button-secondary" type="button" onClick={() => setPendingTrackId(recommendation.trackId)}>
                  切换到 {recommendation.title}
                </button>
              </article>
            ))
          ) : (
            <p>还没有推荐。读到当前片段后，可以先分析氛围。</p>
          )}
        </div>
      </details>

      {pendingTrack && (
        <div className="bgm-confirm" role="alert">
          <p>确认切换到「{pendingTrack.title}」？</p>
          <div className="bgm-actions">
            <button className="button-primary" type="button" onClick={confirmSwitch}>
              确认切换
            </button>
            <button className="button-secondary" type="button" onClick={() => setPendingTrackId(undefined)}>
              取消
            </button>
          </div>
        </div>
      )}

      <details className="panel-section" open>
        <summary>
          <span><Icon name="music" />我的曲库</span>
          <small>{tracks.length} 首</small>
        </summary>
        <section className="section-body bgm-library" aria-label="我的 BGM 曲库">
          {tracks.map((track) => (
            <article className="bgm-library-item" key={track.id}>
              <div>
                <strong>{track.title}</strong>
                <p>{describeTrackTags(track)}</p>
                <small>{track.source === "built-in" ? "内置标签曲目" : "本地音频"}</small>
              </div>
              <div className="bgm-library-actions">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => onConfirmSwitch(track.id)}
                  disabled={track.source === "built-in" && !track.fileRef}
                >
                  设为当前 {track.title}
                </button>
                {track.source === "user-uploaded" && (
                  <button className="button-danger" type="button" onClick={() => onDeleteTrack(track.id)}>
                    <Icon name="trash" />
                    删除 {track.title}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </details>

      <details className="panel-section">
        <summary>
          <span><Icon name="upload" />添加本地音频</span>
          <Icon name="chevron" />
        </summary>
        <form className="section-body bgm-upload" onSubmit={submitUpload}>
          <label>
            音频文件
            <input
              aria-label="音频文件"
              accept="audio/*"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0])}
            />
          </label>
          <label>
            曲名
            <input aria-label="曲名" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            情绪标签
            <input aria-label="情绪标签" value={moods} onChange={(event) => setMoods(event.target.value)} />
          </label>
          <label>
            场景标签
            <input aria-label="场景标签" value={scenes} onChange={(event) => setScenes(event.target.value)} />
          </label>
          <div className="bgm-metrics">
            <label>
              能量
              <input
                aria-label="能量"
                max="1"
                min="0"
                step="0.1"
                type="range"
                value={energy}
                onChange={(event) => setEnergy(Number(event.target.value))}
              />
            </label>
            <label>
              暗度
              <input
                aria-label="暗度"
                max="1"
                min="0"
                step="0.1"
                type="range"
                value={darkness}
                onChange={(event) => setDarkness(Number(event.target.value))}
              />
            </label>
            <label>
              暖度
              <input
                aria-label="暖度"
                max="1"
                min="0"
                step="0.1"
                type="range"
                value={warmth}
                onChange={(event) => setWarmth(Number(event.target.value))}
              />
            </label>
          </div>
          <label>
            节奏
            <select aria-label="节奏" value={tempo} onChange={(event) => setTempo(event.target.value as Tempo)}>
              <option value="slow">慢</option>
              <option value="medium">中</option>
              <option value="fast">快</option>
            </select>
          </label>
          <button className="button-primary" type="submit" disabled={!file}>
            保存本地音频
          </button>
        </form>
      </details>
    </section>
  );
}
