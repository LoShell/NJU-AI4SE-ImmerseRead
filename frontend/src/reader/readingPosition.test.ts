import { describe, expect, it } from "vitest";
import { mergeReadRanges, selectionOffsets } from "./readingPosition";

describe("source positions", () => {
  it("locates a repeated selection using the actual DOM range including emoji and newlines", () => {
    const root = document.createElement("div"); root.textContent = "相同句子\n🙂\n相同句子";
    document.body.append(root);
    const range = document.createRange(); const start = root.textContent.lastIndexOf("相同句子");
    range.setStart(root.firstChild!, start); range.setEnd(root.firstChild!, start + 4);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    expect(selectionOffsets(root, selection)).toEqual({ start, end: start + 4 });
    const outside = document.createElement("span"); outside.textContent = "别处"; document.body.append(outside);
    range.selectNodeContents(outside); selection.removeAllRanges(); selection.addRange(range);
    expect(selectionOffsets(root, selection)).toBeUndefined();
    selection.removeAllRanges(); root.remove(); outside.remove();
  });
  it("merges only observed overlapping intervals and preserves skipped gaps", () => {
    expect(mergeReadRanges([{ start: 0, end: 10 }, { start: 30, end: 40 }], { start: 5, end: 20 }))
      .toEqual([{ start: 0, end: 20 }, { start: 30, end: 40 }]);
  });
});
