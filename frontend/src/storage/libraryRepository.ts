import type { Book, ReadingProgress, Segment } from "../domain/models";
import type { ParsedBook } from "../reader/txtParser";
import { getDb } from "./db";

export interface BookWithSegments {
  book: Book;
  segments: Segment[];
}

export async function saveParsedBook(parsed: ParsedBook): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["books", "segments"], "readwrite");

  await tx.objectStore("books").put(parsed.book);
  await Promise.all(parsed.segments.map((segment) => tx.objectStore("segments").put(segment)));
  await tx.done;
}

export async function getBookWithSegments(bookId: string): Promise<BookWithSegments | undefined> {
  const db = await getDb();
  const book = await db.get("books", bookId);

  if (!book) {
    return undefined;
  }

  const segments = await db.getAllFromIndex("segments", "bookId", bookId);
  return {
    book,
    segments: [...segments].sort((left, right) => left.index - right.index)
  };
}

export async function saveReadingProgress(progress: ReadingProgress): Promise<void> {
  const db = await getDb();
  await db.put("progress", progress);
}

export async function getReadingProgress(bookId: string): Promise<ReadingProgress | undefined> {
  const db = await getDb();
  return db.get("progress", bookId);
}
