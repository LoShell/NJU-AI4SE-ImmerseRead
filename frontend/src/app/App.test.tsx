import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Annotation, Book, ChatMessage, ReadingProgress, Segment } from "../domain/models";
import { parseTxtBook } from "../reader/txtParser";
import { App } from "./App";

const stored = vi.hoisted(() => ({ books: new Map<string, { book: Book; segments: Segment[] }>(), progress: new Map<string, ReadingProgress>() }));
vi.mock("../storage/libraryRepository", () => ({
  listBooks: vi.fn(async () => [...stored.books.values()].map(item => item.book)),
  getBookWithSegments: vi.fn(async (id: string) => stored.books.get(id)),
  getReadingProgress: vi.fn(async (id: string) => stored.progress.get(id)),
  saveParsedBook: vi.fn(async (value: { book: Book; segments: Segment[] }) => { stored.books.set(value.book.id, value); }),
  saveReadingProgress: vi.fn(async (value: ReadingProgress) => { stored.progress.set(value.bookId, value); }),
  listAnnotations: vi.fn(async (): Promise<Annotation[]> => []),
  listChatMessages: vi.fn(async (): Promise<ChatMessage[]> => []),
  listBgmTracks: vi.fn(async () => []),
  saveAnnotation: vi.fn(async () => undefined), deleteAnnotation: vi.fn(async () => undefined),
  saveChatMessage: vi.fn(async () => undefined), saveAtmosphereProfile: vi.fn(async () => undefined),
  saveBgmTrack: vi.fn(async () => undefined), deleteBgmTrack: vi.fn(async () => undefined)
}));

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  stored.books.clear(); stored.progress.clear(); localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "ok", llmConfigured: false }), { status: 200 })));
});

describe("Figma page integration", () => {
  it("starts without sample novel, fabricated messages or frontend credentials", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "ImmerseRead" })).toBeInTheDocument();
    expect(screen.getByText("把故事，留给此刻。")).toBeInTheDocument();
    expect(screen.queryByText("青云问剑录")).not.toBeInTheDocument();
    expect(screen.getByLabelText("给书搭子的消息")).toBeDisabled();
    await screen.findByText("LLM 未配置");
  });

  it("imports through the existing parser and changes real chapters without pre-reading them", async () => {
    render(<App />);
    const file = new File(["Chapter 1 Dawn\nThe door opened.\n\nChapter 2 Rain\nThe rain became urgent."], "moon-city.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("上传 TXT 小说"), { target: { files: [file] } });
    fireEvent.click(await screen.findByRole("button", { name: "Chapter 2 Rain" }));
    expect(await screen.findByRole("heading", { name: "Chapter 2 Rain" })).toBeInTheDocument();
    await waitFor(() => expect([...stored.progress.values()][0]?.charOffsetInSegment).toBe(0));
    expect([...stored.progress.values()][0]?.readRanges).toEqual([]);
  });

  it("restores the saved book and chapter from the repository", async () => {
    const parsed = parseTxtBook({ fileName: "saved.txt", text: "Chapter 1 Dawn\nFirst.\nChapter 2 Rain\nSecond." });
    stored.books.set(parsed.book.id, parsed);
    const segment = parsed.segments[1];
    stored.progress.set(parsed.book.id, { bookId: parsed.book.id, segmentId: segment.id, charOffsetInSegment: 3, absoluteCharOffset: segment.startChar + 3, updatedAt: "2026-10-27", scrollRatio: .5 });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Chapter 2 Rain" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chapter 2 Rain" })).toHaveAttribute("aria-current", "true");
  });

  it("persists reference theme selection without replacing its appearance", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "阅读设置" }));
    fireEvent.click(screen.getByRole("button", { name: "竹绿" }));
    expect(document.querySelector(".figma-reader")).toHaveClass("reader-theme-forest");
    await waitFor(() => expect(localStorage.getItem("immerseread:ui:theme")).toBe('"forest"'));
  });

  it("keeps one audio element while switching tabs and collapsing the music bar", async () => {
    render(<App />);
    const audio = screen.getByLabelText("本地音频播放器");
    fireEvent.click(screen.getByRole("button", { name: "批注" }));
    fireEvent.click(screen.getByRole("button", { name: "收起音乐栏" }));
    expect(screen.getByLabelText("本地音频播放器")).toBe(audio);
    await screen.findByText("LLM 未配置");
  });
});
