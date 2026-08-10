import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Annotation, ChatMessage, ReadingProgress, Segment } from "../domain/models";
import type { ParsedBook } from "../reader/txtParser";
import {
  getBookWithSegments,
  getReadingProgress,
  listAnnotations,
  listChatMessages,
  saveAnnotation,
  saveChatMessage,
  saveParsedBook,
  saveReadingProgress,
  deleteAnnotation
} from "./libraryRepository";

const fakeIdb = vi.hoisted(() => {
  type FakeStore = Map<string, unknown>;
  type StoreBag = Record<string, FakeStore>;

  const stores: StoreBag = {
    books: new Map(),
    segments: new Map(),
    progress: new Map(),
    annotations: new Map(),
    chatMessages: new Map(),
    atmosphereProfiles: new Map(),
    bgmTracks: new Map()
  };

  const keyFor = (storeName: string, value: unknown, explicitKey?: IDBValidKey): string => {
    if (explicitKey !== undefined) {
      return String(explicitKey);
    }

    const record = value as { id?: string; bookId?: string; segmentId?: string };
    if (storeName === "progress") {
      return String(record.bookId);
    }
    if (storeName === "atmosphereProfiles") {
      return String(record.segmentId);
    }
    return String(record.id);
  };

  const put = async (storeName: string, value: unknown, key?: IDBValidKey) => {
    stores[storeName].set(keyFor(storeName, value, key), structuredClone(value));
  };

  const get = async (storeName: string, key: IDBValidKey) => {
    const value = stores[storeName].get(String(key));
    return value === undefined ? undefined : structuredClone(value);
  };

  const getAllFromIndex = async (storeName: string, indexName: string, key: IDBValidKey) => {
    const property = indexName === "by-source" ? "source" : indexName;
    return Array.from(stores[storeName].values())
      .filter((value) => (value as Record<string, unknown>)[property] === key)
      .map((value) => structuredClone(value));
  };

  const deleteRecord = async (storeName: string, key: IDBValidKey) => {
    stores[storeName].delete(String(key));
  };

  const transaction = () => ({
    objectStore: (storeName: string) => ({
      put: (value: unknown, key?: IDBValidKey) => put(storeName, value, key),
      get: (key: IDBValidKey) => get(storeName, key),
      getAllFromIndex: (indexName: string, key: IDBValidKey) => getAllFromIndex(storeName, indexName, key),
      delete: (key: IDBValidKey) => deleteRecord(storeName, key)
    }),
    done: Promise.resolve()
  });

  return {
    stores,
    openDB: vi.fn(async () => ({
      put,
      get,
      getAllFromIndex,
      delete: deleteRecord,
      transaction
    })),
    reset: () => {
      for (const store of Object.values(stores)) {
        store.clear();
      }
    }
  };
});

vi.mock("idb", () => ({
  openDB: fakeIdb.openDB
}));

describe("libraryRepository", () => {
  beforeEach(() => {
    fakeIdb.reset();
    fakeIdb.openDB.mockClear();
  });

  it("saves a parsed book and restores its segments ordered by index", async () => {
    const parsed = createParsedBook({
      bookId: "book-1",
      segments: [
        createSegment({ id: "segment-3", bookId: "book-1", index: 2, title: "Ending", text: "omega" }),
        createSegment({ id: "segment-1", bookId: "book-1", index: 0, title: "Opening", text: "alpha" }),
        createSegment({ id: "segment-2", bookId: "book-1", index: 1, title: "Middle", text: "beta" })
      ]
    });

    await saveParsedBook(parsed);

    await expect(getBookWithSegments("book-1")).resolves.toEqual({
      book: parsed.book,
      segments: [parsed.segments[1], parsed.segments[2], parsed.segments[0]]
    });
  });

  it("saves reading progress by book id and restores the latest value", async () => {
    const olderProgress: ReadingProgress = {
      bookId: "book-1",
      segmentId: "segment-1",
      charOffsetInSegment: 12,
      absoluteCharOffset: 12,
      updatedAt: "2026-08-07T01:00:00.000Z"
    };
    const latestProgress: ReadingProgress = {
      bookId: "book-1",
      segmentId: "segment-2",
      charOffsetInSegment: 4,
      absoluteCharOffset: 99,
      updatedAt: "2026-08-07T02:00:00.000Z"
    };

    await saveReadingProgress(olderProgress);
    await saveReadingProgress(latestProgress);

    await expect(getReadingProgress("book-1")).resolves.toEqual(latestProgress);
  });

  it("returns undefined when book and progress records are missing", async () => {
    await expect(getBookWithSegments("missing-book")).resolves.toBeUndefined();
    await expect(getReadingProgress("missing-book")).resolves.toBeUndefined();
  });

  it("saves, lists, and deletes annotations for a segment", async () => {
    const first = createAnnotation({ id: "annotation-1", segmentId: "segment-1", selectedText: "alpha" });
    const second = createAnnotation({ id: "annotation-2", segmentId: "segment-1", selectedText: "beta" });
    const otherSegment = createAnnotation({ id: "annotation-3", segmentId: "segment-2", selectedText: "gamma" });

    await saveAnnotation(second);
    await saveAnnotation(otherSegment);
    await saveAnnotation(first);

    await expect(listAnnotations("book-1", "segment-1")).resolves.toEqual([first, second]);

    await deleteAnnotation("annotation-1");

    await expect(listAnnotations("book-1", "segment-1")).resolves.toEqual([second]);
  });

  it("saves and lists chat messages for a book in creation order", async () => {
    const second = createChatMessage({
      id: "message-2",
      content: "second",
      createdAt: "2026-08-07T02:00:00.000Z"
    });
    const first = createChatMessage({
      id: "message-1",
      content: "first",
      createdAt: "2026-08-07T01:00:00.000Z"
    });
    const otherBook = createChatMessage({
      id: "message-3",
      bookId: "book-2",
      content: "other",
      createdAt: "2026-08-07T00:00:00.000Z"
    });

    await saveChatMessage(second);
    await saveChatMessage(otherBook);
    await saveChatMessage(first);

    await expect(listChatMessages("book-1")).resolves.toEqual([first, second]);
  });
});

function createParsedBook(input: { bookId: string; segments: Segment[] }): ParsedBook {
  return {
    book: {
      id: input.bookId,
      title: "The Test Library",
      sourceFileName: "library.txt",
      createdAt: "2026-08-07T00:00:00.000Z",
      updatedAt: "2026-08-07T00:00:00.000Z",
      totalChars: 14,
      parserVersion: "txt-v1"
    },
    segments: input.segments
  };
}

function createSegment(input: {
  id: string;
  bookId: string;
  index: number;
  title: string;
  text: string;
}): Segment {
  return {
    id: input.id,
    bookId: input.bookId,
    index: input.index,
    title: input.title,
    startChar: input.index * 10,
    endChar: input.index * 10 + input.text.length,
    text: input.text,
    type: "chapter",
    parseConfidence: "high",
    atmosphereStatus: "pending"
  };
}

function createAnnotation(overrides: Partial<Annotation>): Annotation {
  return {
    id: "annotation-1",
    bookId: "book-1",
    segmentId: "segment-1",
    startChar: 0,
    endChar: 5,
    selectedText: "alpha",
    note: "",
    color: "yellow",
    createdAt: "2026-08-07T00:00:00.000Z",
    updatedAt: "2026-08-07T00:00:00.000Z",
    ...overrides
  };
}

function createChatMessage(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "message-1",
    bookId: "book-1",
    segmentId: "segment-1",
    role: "assistant",
    content: "content",
    contextStartChar: 0,
    contextEndChar: 10,
    spoilerPolicy: "strict",
    createdAt: "2026-08-07T00:00:00.000Z",
    ...overrides
  };
}
