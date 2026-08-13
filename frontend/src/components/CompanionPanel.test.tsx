import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChatMessage, ReadingProgress, Segment } from "../domain/models";
import { CompanionPanel } from "./CompanionPanel";

const sendCompanionChat = vi.hoisted(() => vi.fn());

vi.mock("../llm/client", () => ({
  sendCompanionChat
}));

describe("CompanionPanel", () => {
  it("shows local messages and sends spoiler-safe context for the active segment", async () => {
    sendCompanionChat.mockResolvedValueOnce({
      content: "I would keep an eye on that promise.",
      modelName: "test-model"
    });
    const persisted: ChatMessage[] = [];
    const segment = createSegment({
      id: "segment-1",
      index: 0,
      startChar: 0,
      endChar: 54,
      text: "She promised to return before dawn. The bell rang twice."
    });
    const progress: ReadingProgress = {
      bookId: "book-1",
      segmentId: "segment-1",
      charOffsetInSegment: 54,
      absoluteCharOffset: 54,
      updatedAt: "2026-08-07T00:00:00.000Z"
    };

    render(
      <CompanionPanel
        activeSegment={segment}
        annotationNote="Promise motif"
        bookId="book-1"
        messages={[createMessage({ content: "This chapter feels tense." })]}
        onPersistMessage={async (message) => {
          persisted.push(message);
        }}
        progress={progress}
        segments={[segment]}
        selectedText="promised to return"
      />
    );

    expect(screen.getByText("This chapter feels tense.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("和书搭子聊聊当前剧情"), {
      target: { value: "What should I notice?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() => {
      expect(screen.getByText("I would keep an eye on that promise.")).toBeInTheDocument();
    });
    expect(sendCompanionChat).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: "book-1",
        segmentId: "segment-1",
        question: "What should I notice?",
        allowedContext: expect.stringContaining("Selected text: promised to return"),
        contextStartChar: 0,
        contextEndChar: 54,
        spoilerRisk: "low"
      })
    );
    expect(persisted.map((message) => message.role)).toEqual(["user", "assistant"]);
  });
});

function createSegment(overrides: Partial<Segment>): Segment {
  return {
    id: "segment-1",
    bookId: "book-1",
    index: 0,
    title: "Chapter 1",
    startChar: 0,
    endChar: 10,
    text: "text",
    type: "chapter",
    parseConfidence: "high",
    atmosphereStatus: "pending",
    ...overrides
  };
}

function createMessage(overrides: Partial<ChatMessage>): ChatMessage {
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
