export interface ReadRange { start: number; end: number }

export function mergeReadRanges(ranges: ReadRange[], next: ReadRange): ReadRange[] {
  const sorted = [...ranges, next].filter((range) => range.end > range.start).sort((a, b) => a.start - b.start);
  const merged: ReadRange[] = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

/** The reader renders one exact text node: DOM and persisted UTF-16 offsets agree. */
export function selectionOffsets(root: HTMLElement, selection: Selection | null): ReadRange | undefined {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
  const prefix = document.createRange();
  prefix.selectNodeContents(root);
  prefix.setEnd(range.startContainer, range.startOffset);
  let start = prefix.toString().length;
  let end = start + range.toString().length;
  const text = root.textContent ?? "";
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return end > start ? { start, end } : undefined;
}

/** Locate the visible portion without assuming a jump means earlier text was read. */
export function visibleTextOffsets(root: HTMLElement, viewport: HTMLElement): ReadRange | undefined {
  const node = root.firstChild;
  const length = node?.textContent?.length ?? 0;
  if (!node || node.nodeType !== Node.TEXT_NODE || !length || viewport.clientHeight <= 0) return;
  const bounds = viewport.getBoundingClientRect();
  const range = document.createRange();
  const rectAt = (index: number) => {
    range.setStart(node, index);
    range.setEnd(node, Math.min(length, index + 1));
    return range.getBoundingClientRect();
  };
  const lowerBound = (predicate: (index: number) => boolean) => {
    let low = 0, high = length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (predicate(mid)) high = mid;
      else low = mid + 1;
    }
    return low;
  };
  const start = lowerBound((index) => rectAt(index).bottom > bounds.top + 8);
  const end = lowerBound((index) => rectAt(index).top >= bounds.bottom - 8);
  return end > start ? { start, end } : undefined;
}
