import { describe, expect, it } from "vitest";
import { createAnnotationFromSelection } from "./annotationRanges";

describe("createAnnotationFromSelection", () => {
  it("creates an annotation draft for a valid text range", () => {
    const draft = createAnnotationFromSelection({
      bookId: "book-1",
      segmentId: "segment-1",
      segmentText: "She pushed the door open. The rain sounded urgent.",
      startChar: 4,
      endChar: 24,
      note: "This feels like a turning point.",
      color: "yellow"
    });

    expect(draft).toMatchObject({
      bookId: "book-1",
      segmentId: "segment-1",
      startChar: 4,
      endChar: 24,
      selectedText: "pushed the door open",
      note: "This feels like a turning point.",
      color: "yellow"
    });
  });

  it("trims notes and normalizes reversed ranges", () => {
    const draft = createAnnotationFromSelection({
      bookId: "book-1",
      segmentId: "segment-1",
      segmentText: "alpha beta gamma",
      startChar: 10,
      endChar: 6,
      note: "  suspect detail  ",
      color: "blue"
    });

    expect(draft.startChar).toBe(6);
    expect(draft.endChar).toBe(10);
    expect(draft.selectedText).toBe("beta");
    expect(draft.note).toBe("suspect detail");
  });

  it("rejects empty ranges", () => {
    expect(() =>
      createAnnotationFromSelection({
        bookId: "book-1",
        segmentId: "segment-1",
        segmentText: "text",
        startChar: 2,
        endChar: 2,
        note: "",
        color: "yellow"
      })
    ).toThrow("Please select text before annotating.");
  });

  it("rejects ranges outside the segment", () => {
    expect(() =>
      createAnnotationFromSelection({
        bookId: "book-1",
        segmentId: "segment-1",
        segmentText: "text",
        startChar: -1,
        endChar: 3,
        note: "",
        color: "yellow"
      })
    ).toThrow("Selection is outside the current segment.");
  });
});
