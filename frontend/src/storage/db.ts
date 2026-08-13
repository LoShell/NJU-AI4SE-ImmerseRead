import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Annotation,
  AtmosphereProfile,
  BgmTrack,
  Book,
  ChatMessage,
  ReadingProgress,
  Segment
} from "../domain/models";

export const DB_NAME = "immerseread";
export const DB_VERSION = 1;

export interface ImmerseReadDb extends DBSchema {
  books: {
    key: string;
    value: Book;
  };
  segments: {
    key: string;
    value: Segment;
    indexes: { bookId: string };
  };
  progress: {
    key: string;
    value: ReadingProgress;
  };
  annotations: {
    key: string;
    value: Annotation;
    indexes: { bookId: string; segmentId: string };
  };
  chatMessages: {
    key: string;
    value: ChatMessage;
    indexes: { bookId: string };
  };
  atmosphereProfiles: {
    key: string;
    value: AtmosphereProfile;
  };
  bgmTracks: {
    key: string;
    value: BgmTrack;
    indexes: { source: string };
  };
}

let dbPromise: Promise<IDBPDatabase<ImmerseReadDb>> | undefined;

export function getDb(): Promise<IDBPDatabase<ImmerseReadDb>> {
  dbPromise ??= openDB<ImmerseReadDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("books")) {
        db.createObjectStore("books", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("segments")) {
        const segments = db.createObjectStore("segments", { keyPath: "id" });
        segments.createIndex("bookId", "bookId");
      }

      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "bookId" });
      }

      if (!db.objectStoreNames.contains("annotations")) {
        const annotations = db.createObjectStore("annotations", { keyPath: "id" });
        annotations.createIndex("bookId", "bookId");
        annotations.createIndex("segmentId", "segmentId");
      }

      if (!db.objectStoreNames.contains("chatMessages")) {
        const chatMessages = db.createObjectStore("chatMessages", { keyPath: "id" });
        chatMessages.createIndex("bookId", "bookId");
      }

      if (!db.objectStoreNames.contains("atmosphereProfiles")) {
        db.createObjectStore("atmosphereProfiles", { keyPath: "segmentId" });
      }

      if (!db.objectStoreNames.contains("bgmTracks")) {
        const bgmTracks = db.createObjectStore("bgmTracks", { keyPath: "id" });
        bgmTracks.createIndex("source", "source");
      }
    }
  });

  return dbPromise;
}
