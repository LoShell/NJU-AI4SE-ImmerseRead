import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("../storage/libraryRepository", () => ({
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
  it("renders an immersive reader workspace with local-first affordances", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "ImmerseRead" })).toBeInTheDocument();
    expect(screen.getByLabelText("上传 TXT 小说")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "章节列表" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "阅读陪伴面板" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "书搭子" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "BGM" })).toBeInTheDocument();
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
    const article = screen.getByRole("article");

    expect(within(sidePanel).getByRole("button", { name: "批注" })).toHaveAttribute("aria-pressed", "true");
    expect(within(sidePanel).getByLabelText("批注工具栏")).toBeInTheDocument();
    expect(within(sidePanel).getByText("The rain became urgent")).toBeInTheDocument();
    expect(within(article).queryByLabelText("批注工具栏")).not.toBeInTheDocument();

    getSelection.mockRestore();
  });

  it("keeps the BGM recommendation controls in the right panel", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "BGM" }));

    const sidePanel = screen.getByRole("complementary", { name: "阅读陪伴面板" });
    expect(within(sidePanel).getByRole("heading", { name: "BGM 推荐" })).toBeInTheDocument();
    expect(within(sidePanel).getByRole("button", { name: "分析当前氛围" })).toBeInTheDocument();
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
