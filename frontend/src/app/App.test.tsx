import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("../storage/libraryRepository", () => ({
  deleteBgmTrack: vi.fn(async () => undefined),
  getAtmosphereProfile: vi.fn(async () => undefined),
  listAnnotations: vi.fn(async () => []),
  listBgmTracks: vi.fn(async () => []),
  listChatMessages: vi.fn(async () => []),
  saveAnnotation: vi.fn(async () => undefined),
  saveAtmosphereProfile: vi.fn(async () => undefined),
  saveBgmTrack: vi.fn(async () => undefined),
  saveChatMessage: vi.fn(async () => undefined),
  saveParsedBook: vi.fn(async () => undefined),
  saveReadingProgress: vi.fn(async () => undefined)
}));

describe("App", () => {
  it("renders an empty reference-style workspace before a TXT is uploaded", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "ImmerseRead" })).toBeInTheDocument();
    expect(screen.getByText("本地书库")).toBeInTheDocument();
    expect(screen.getByLabelText("上传 TXT 小说")).toBeInTheDocument();
    expect(screen.getByAltText("默认书籍封面")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "暂无书籍" })).toBeInTheDocument();
    expect(screen.getByText("匿名作者")).toBeInTheDocument();
    expect(screen.getByText("文件大小未知")).toBeInTheDocument();
    expect(screen.queryByText("雾港来信")).not.toBeInTheDocument();
    expect(screen.queryByText("第三章 · 雨夜来客")).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "本地保存提醒" })).not.toBeInTheDocument();
    expect(screen.getByText("导入 TXT 后开始阅读。")).toBeInTheDocument();
  });

  it("keeps the BGM player docked in the right panel outside the active tab", () => {
    render(<App />);

    const sidePanel = screen.getByRole("complementary", { name: "阅读陪伴面板" });
    expect(within(sidePanel).getByRole("button", { name: /书搭子/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(sidePanel).getByLabelText("BGM 常驻播放器")).toBeInTheDocument();
    expect(within(sidePanel).getByAltText("默认 BGM 封面")).toBeInTheDocument();

    fireEvent.click(within(sidePanel).getByRole("button", { name: "批注" }));

    expect(within(sidePanel).getByLabelText("BGM 常驻播放器")).toBeInTheDocument();
    expect(within(sidePanel).getByAltText("默认 BGM 封面")).toBeInTheDocument();
  });

  it("imports a local TXT file and lets the reader switch chapters", async () => {
    render(<App />);

    uploadDemoBook();

    expect(await screen.findByRole("heading", { name: "moon-city" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chapter 1 Dawn" })).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByRole("button", { name: "Chapter 2 Rain" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Chapter 2 Rain" })).toBeInTheDocument();
    });
    expect(screen.getByText("The rain became urgent.")).toBeInTheDocument();
    expect(screen.getByText("阅读进度")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows the active annotation editor at the top of the right annotation panel", async () => {
    const getSelection = vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "The rain became urgent"
    } as Selection);
    render(<App />);

    uploadDemoBook();

    fireEvent.click(await screen.findByRole("button", { name: "Chapter 2 Rain" }));
    fireEvent.mouseUp(screen.getByText("The rain became urgent."));

    const sidePanel = screen.getByRole("complementary", { name: "阅读陪伴面板" });
    const readingArea = screen.getByRole("region", { name: "阅读区" });
    const article = within(readingArea).getByRole("article");

    expect(within(sidePanel).getByRole("button", { name: "批注" })).toHaveAttribute("aria-pressed", "true");
    expect(within(sidePanel).getByLabelText("批注工具栏")).toBeInTheDocument();
    expect(within(sidePanel).getByText("The rain became urgent")).toBeInTheDocument();
    expect(within(article).queryByLabelText("批注工具栏")).not.toBeInTheDocument();

    getSelection.mockRestore();
  });

  it("uses the BGM tab for the song library instead of duplicating the player", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /BGM/ }));

    const sidePanel = screen.getByRole("complementary", { name: "阅读陪伴面板" });
    const libraryPanel = within(sidePanel).getByLabelText("BGM 曲库面板");
    expect(within(libraryPanel).getByText("我的曲库")).toBeInTheDocument();
    expect(within(libraryPanel).getByText("添加本地音频")).toBeInTheDocument();
    expect(within(libraryPanel).queryByAltText("默认 BGM 封面")).not.toBeInTheDocument();
    expect(within(libraryPanel).queryByRole("button", { name: /分析当前氛围/ })).not.toBeInTheDocument();
  });
});

function uploadDemoBook() {
  const file = new File(
    ["Chapter 1 Dawn\nThe door opened.\n\nChapter 2 Rain\nThe rain became urgent."],
    "moon-city.txt",
    { type: "text/plain" }
  );

  fireEvent.change(screen.getByLabelText("上传 TXT 小说"), {
    target: { files: [file] }
  });
}
