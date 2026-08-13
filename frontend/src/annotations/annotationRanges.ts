export interface SelectionInput {
  bookId: string;
  segmentId: string;
  segmentText: string;
  startChar: number;
  endChar: number;
  note: string;
  color: string;
}

export interface AnnotationDraft {
  bookId: string;
  segmentId: string;
  startChar: number;
  endChar: number;
  selectedText: string;
  note: string;
  color: string;
}

export function createAnnotationFromSelection(input: SelectionInput): AnnotationDraft {
  const startChar = Math.min(input.startChar, input.endChar);
  const endChar = Math.max(input.startChar, input.endChar);

  if (startChar === endChar) {
    throw new Error("Please select text before annotating.");
  }

  if (startChar < 0 || endChar > input.segmentText.length) {
    throw new Error("Selection is outside the current segment.");
  }

  const selectedText = input.segmentText.slice(startChar, endChar).trim();
  if (selectedText.length === 0) {
    throw new Error("Please select text before annotating.");
  }

  return {
    bookId: input.bookId,
    segmentId: input.segmentId,
    startChar,
    endChar,
    selectedText,
    note: input.note.trim(),
    color: input.color
  };
}
