import { describe, expect, it } from "vitest";
import { builtInTracks } from "./builtInTracks";

describe("builtInTracks", () => {
  it("registers the demo audio files as playable built-in tracks", () => {
    expect(builtInTracks.map((track) => track.fileRef)).toEqual([
      "/bgm/DearJohn.mp3",
      "/bgm/爱的供养.mp3",
      "/bgm/Valhalla.mp3",
      "/bgm/岸边客.mp3",
      "/bgm/招摇.mp3",
      "/bgm/蠢货.mp3",
      "/bgm/鲜衣怒马少年郎.mp3"
    ]);
  });
});
