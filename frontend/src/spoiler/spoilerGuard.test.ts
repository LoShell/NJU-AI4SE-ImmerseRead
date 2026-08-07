import { describe, expect, it } from "vitest";
import type { ReadingProgress, Segment } from "../domain/models";
import { buildAllowedContext } from "./spoilerGuard";

const makeSegment = (overrides: Partial<Segment>): Segment => ({
  id: overrides.id ?? "segment-1",
  bookId: overrides.bookId ?? "book-1",
  index: overrides.index ?? 0,
  title: overrides.title ?? "Segment",
  startChar: overrides.startChar ?? 0,
  endChar: overrides.endChar ?? (overrides.text?.length ?? 0),
  text: overrides.text ?? "",
  type: overrides.type ?? "chapter",
  parseConfidence: overrides.parseConfidence ?? "high",
  atmosphereStatus: overrides.atmosphereStatus ?? "pending"
});

const makeProgress = (overrides: Partial<ReadingProgress>): ReadingProgress => ({
  bookId: overrides.bookId ?? "book-1",
  segmentId: overrides.segmentId ?? "segment-1",
  charOffsetInSegment: overrides.charOffsetInSegment ?? 0,
  absoluteCharOffset: overrides.absoluteCharOffset ?? 0,
  updatedAt: overrides.updatedAt ?? "2026-08-07T00:00:00.000Z"
});

describe("buildAllowedContext", () => {
  it("excludes unread future text after progress", () => {
    const segments = [
      makeSegment({ id: "segment-1", startChar: 0, endChar: 10, text: "0123456789" }),
      makeSegment({ id: "segment-2", startChar: 10, endChar: 20, text: "abcdefghij" })
    ];
    const progress = makeProgress({
      segmentId: "segment-1",
      charOffsetInSegment: 6,
      absoluteCharOffset: 8
    });

    const context = buildAllowedContext({ segments, progress, question: "What happened?" });

    expect(context.text).toContain("012345");
    expect(context.text).not.toContain("6789");
    expect(context.text).not.toContain("abcdefghij");
    expect(context.contextStartChar).toBe(0);
    expect(context.contextEndChar).toBe(6);
  });

  it("marks future-oriented questions as high risk", () => {
    const segment = makeSegment({ startChar: 0, endChar: 16, text: "already read text" });
    const progress = makeProgress({
      segmentId: segment.id,
      charOffsetInSegment: segment.text.length,
      absoluteCharOffset: segment.endChar
    });

    const context = buildAllowedContext({
      segments: [segment],
      progress,
      question: "Will the boss appear later?"
    });

    expect(context.spoilerRisk).toBe("high");
    expect(context.instruction).toContain(
      "鍙兘鍩轰簬宸茶鍐呭鍥炵瓟锛涗笉瑕佹殫绀恒€佺‘璁ゆ垨寮曠敤鏈鍓ф儏銆?"
    );
  });

  it("trims long read-so-far context to maxChars from the end", () => {
    const segment = makeSegment({ startChar: 0, endChar: 10, text: "0123456789" });
    const progress = makeProgress({
      segmentId: segment.id,
      charOffsetInSegment: 10,
      absoluteCharOffset: 10
    });

    const context = buildAllowedContext({
      segments: [segment],
      progress,
      question: "Summarize",
      maxChars: 4
    });

    expect(context.text).toBe("6789");
    expect(context.contextStartChar).toBe(6);
    expect(context.contextEndChar).toBe(10);
  });

  it("includes selected text and annotation note when present", () => {
    const segment = makeSegment({ startChar: 0, endChar: 12, text: "read context" });
    const progress = makeProgress({
      segmentId: segment.id,
      charOffsetInSegment: segment.text.length,
      absoluteCharOffset: segment.endChar
    });

    const context = buildAllowedContext({
      segments: [segment],
      progress,
      question: "Explain this",
      selectedText: "read",
      annotationNote: "important opening"
    });

    expect(context.text).toContain("read context");
    expect(context.text).toContain("Selected text: read");
    expect(context.text).toContain("Annotation note: important opening");
    expect(context.contextEndChar).toBe(12);
  });

  it("sorts unsorted segments before building context", () => {
    const later = makeSegment({ id: "segment-2", index: 1, startChar: 5, endChar: 10, text: "World" });
    const earlier = makeSegment({ id: "segment-1", index: 0, startChar: 0, endChar: 5, text: "Hello" });
    const progress = makeProgress({
      segmentId: later.id,
      charOffsetInSegment: 5,
      absoluteCharOffset: 10
    });

    const context = buildAllowedContext({
      segments: [later, earlier],
      progress,
      question: "Repeat it"
    });

    expect(context.text).toBe("HelloWorld");
    expect(context.contextStartChar).toBe(0);
    expect(context.contextEndChar).toBe(10);
  });
});
