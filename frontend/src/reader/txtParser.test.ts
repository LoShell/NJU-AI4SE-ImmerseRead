import { describe, expect, it } from "vitest";
import { parseTxtBook } from "./txtParser";

describe("parseTxtBook", () => {
  it("recognizes common Chinese chapter headings", () => {
    const text = "绗竴绔?鍒濊\n濂规帹寮€闂ㄣ€俓n\n绗簩绔?澶滈洦\n闆ㄥ０寰堟€ャ€?";

    const parsed = parseTxtBook({ fileName: "demo.txt", text });

    expect(parsed.book.title).toBe("demo");
    expect(parsed.book.sourceFileName).toBe("demo.txt");
    expect(parsed.book.totalChars).toBe(text.length);
    expect(parsed.segments).toHaveLength(2);
    expect(parsed.segments[0]).toMatchObject({
      bookId: parsed.book.id,
      index: 0,
      title: "绗竴绔?鍒濊",
      startChar: 0,
      type: "chapter",
      parseConfidence: "high",
      atmosphereStatus: "pending"
    });
    expect(parsed.segments[1]).toMatchObject({
      index: 1,
      title: "绗簩绔?澶滈洦",
      type: "chapter",
      parseConfidence: "high"
    });
  });

  it("falls back to chunks when chapter headings are unreliable", () => {
    const text = "鍗蜂竴\n" + "涓€娈垫櫘閫氭鏂囥€俓n".repeat(20);

    const parsed = parseTxtBook({
      fileName: "plain.txt",
      text,
      chunkSize: 30
    });

    expect(parsed.segments.length).toBeGreaterThan(1);
    expect(parsed.segments[0]).toMatchObject({
      title: "鐗囨 1",
      type: "chunk",
      parseConfidence: "low",
      startChar: 0
    });
  });

  it("preserves exact text order across parsed segments", () => {
    const text = "Chapter 1 Dawn\nalpha\n\n2. Night\nbeta\n\n3 The End\ngamma";

    const parsed = parseTxtBook({ fileName: "order.txt", text });

    expect(parsed.segments.map((segment) => segment.text).join("")).toBe(text);
    expect(parsed.segments.map((segment) => [segment.startChar, segment.endChar])).toEqual([
      [0, 22],
      [22, 37],
      [37, 52]
    ]);
  });

  it("returns one empty chunk for empty or whitespace-only text", () => {
    const empty = parseTxtBook({ fileName: "empty.txt", text: "" });
    const whitespace = parseTxtBook({ fileName: "blank.txt", text: "  \n\t  " });

    expect(empty.segments).toHaveLength(1);
    expect(empty.segments[0]).toMatchObject({
      title: "鐗囨 1",
      startChar: 0,
      endChar: 0,
      text: "",
      type: "chunk",
      parseConfidence: "low"
    });
    expect(whitespace.segments.map((segment) => segment.text).join("")).toBe("  \n\t  ");
    expect(whitespace.segments[0].endChar).toBe(whitespace.book.totalChars);
  });
});
