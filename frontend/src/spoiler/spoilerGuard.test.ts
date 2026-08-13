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
    const readText = "前文线索一二三四五";
    const unreadText = "未读真相：凶手是乙。";
    const segments = [
      makeSegment({ id: "segment-1", startChar: 0, text: readText }),
      makeSegment({ id: "segment-2", startChar: readText.length, endChar: readText.length + unreadText.length, text: unreadText })
    ];
    const progress = makeProgress({
      segmentId: "segment-1",
      charOffsetInSegment: 5,
      absoluteCharOffset: readText.length
    });

    const context = buildAllowedContext({ segments, progress, question: "凶手是谁？" });

    expect(context.text).toContain("前文线索");
    expect(context.text).not.toContain("未读真相");
    expect(context.text).not.toContain("凶手是乙");
    expect(context.contextStartChar).toBe(0);
    expect(context.contextEndChar).toBe(5);
  });

  it("marks future-oriented Chinese questions as high risk", () => {
    const text = "已经读过的内容";
    const segment = makeSegment({ startChar: 0, text });
    const progress = makeProgress({
      segmentId: segment.id,
      charOffsetInSegment: segment.text.length,
      absoluteCharOffset: segment.endChar
    });

    const context = buildAllowedContext({
      segments: [segment],
      progress,
      question: "他后来是不是反派？"
    });

    expect(context.spoilerRisk).toBe("high");
    expect(context.instruction).toContain("只能基于已读内容回答");
    expect(context.instruction).toContain("不要暗示、确认或引用未读剧情");
  });

  it("marks English boss questions as high risk", () => {
    const segment = makeSegment({ startChar: 0, endChar: 12, text: "already read" });
    const progress = makeProgress({
      segmentId: segment.id,
      charOffsetInSegment: segment.text.length,
      absoluteCharOffset: segment.endChar
    });

    const context = buildAllowedContext({
      segments: [segment],
      progress,
      question: "Will the BOSS appear later?"
    });

    expect(context.spoilerRisk).toBe("high");
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
      question: "总结一下",
      maxChars: 4
    });

    expect(context.text).toBe("6789");
    expect(context.contextStartChar).toBe(6);
    expect(context.contextEndChar).toBe(10);
  });

  it("includes selected text and annotation note when present", () => {
    const text = "已读上下文";
    const segment = makeSegment({ startChar: 0, text });
    const progress = makeProgress({
      segmentId: segment.id,
      charOffsetInSegment: segment.text.length,
      absoluteCharOffset: segment.endChar
    });

    const context = buildAllowedContext({
      segments: [segment],
      progress,
      question: "解释这里",
      selectedText: "已读",
      annotationNote: "这里像是在铺垫"
    });

    expect(context.text).toContain("已读上下文");
    expect(context.text).toContain("Selected text: 已读");
    expect(context.text).toContain("Annotation note: 这里像是在铺垫");
    expect(context.contextEndChar).toBe(text.length);
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
