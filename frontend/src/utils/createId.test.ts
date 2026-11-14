import { afterEach, describe, expect, it, vi } from "vitest";
import { parseTxtBook } from "../reader/txtParser";
import { createId } from "./createId";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createId", () => {
  it("uses the native UUID API when available", () => {
    const randomUUID = vi.fn(() => "00000000-0000-4000-8000-000000000001");
    vi.stubGlobal("crypto", { randomUUID });

    expect(createId()).toBe("00000000-0000-4000-8000-000000000001");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("imports books with unique UUIDs when randomUUID is unavailable", () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal("crypto", { getRandomValues });

    const first = parseTxtBook({ fileName: "demo.txt", text: "Chapter 1\nHello\nChapter 2\nWorld" });
    const second = parseTxtBook({ fileName: "demo.txt", text: "Another book" });
    const ids = [first.book.id, ...first.segments.map((segment) => segment.id), second.book.id];

    expect(first.segments).toHaveLength(2);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(uuidPattern);
    }
    expect(first.segments.every((segment) => segment.bookId === first.book.id)).toBe(true);
  });
});
