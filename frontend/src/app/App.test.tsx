import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("../storage/libraryRepository", () => ({
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

    const file = new File(
      ["Chapter 1 Dawn\nThe door opened.\n\nChapter 2 Rain\nThe rain became urgent."],
      "moon-city.txt",
      { type: "text/plain" }
    );

    fireEvent.change(screen.getByLabelText("上传 TXT 小说"), {
      target: { files: [file] }
    });

    expect(await screen.findByRole("heading", { name: "moon-city" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chapter 1 Dawn" })).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByRole("button", { name: "Chapter 2 Rain" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Chapter 2 Rain" })).toBeInTheDocument();
    });
    expect(screen.getByText("The rain became urgent.")).toBeInTheDocument();
  });
});
