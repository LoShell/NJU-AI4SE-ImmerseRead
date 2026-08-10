import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnnotationDraft } from "../annotations/annotationRanges";
import { AnnotationToolbar } from "./AnnotationToolbar";

describe("AnnotationToolbar", () => {
  it("saves notes and can send the selected text to companion chat", () => {
    const draft: AnnotationDraft = {
      bookId: "book-1",
      segmentId: "segment-1",
      startChar: 4,
      endChar: 20,
      selectedText: "promise before dawn",
      note: "",
      color: "yellow"
    };
    const onSave = vi.fn();
    const onAskCompanion = vi.fn();

    render(<AnnotationToolbar draft={draft} onAskCompanion={onAskCompanion} onSave={onSave} />);

    expect(screen.getByText("promise before dawn")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("批注内容"), {
      target: { value: "This promise may matter." }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存批注" }));
    fireEvent.click(screen.getByRole("button", { name: "问书搭子" }));

    expect(onSave).toHaveBeenCalledWith({ ...draft, note: "This promise may matter." });
    expect(onAskCompanion).toHaveBeenCalledWith({ ...draft, note: "This promise may matter." });
  });
});
