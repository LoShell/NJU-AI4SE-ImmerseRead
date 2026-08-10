import { afterEach, describe, expect, it, vi } from "vitest";
import { sendCompanionChat } from "./client";

describe("sendCompanionChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts spoiler-safe chat requests to the backend", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ content: "Stay with what you have read.", modelName: "test-model" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await sendCompanionChat({
      bookId: "book-1",
      segmentId: "segment-1",
      question: "What is going on here?",
      allowedContext: "Only read text.",
      contextStartChar: 0,
      contextEndChar: 15,
      spoilerRisk: "low"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/llm/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: "book-1",
          segmentId: "segment-1",
          question: "What is going on here?",
          allowedContext: "Only read text.",
          contextStartChar: 0,
          contextEndChar: 15,
          spoilerRisk: "low"
        })
      })
    );
    expect(response).toEqual({ content: "Stay with what you have read.", modelName: "test-model" });
  });

  it("returns a disabled response when the backend rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ message: "missing key" }), { status: 503 }))
    );

    await expect(
      sendCompanionChat({
        bookId: "book-1",
        segmentId: "segment-1",
        question: "Help?",
        allowedContext: "context",
        contextStartChar: 0,
        contextEndChar: 7,
        spoilerRisk: "low"
      })
    ).resolves.toEqual({
      content: "LLM is not available yet. You can keep reading locally.",
      modelName: "disabled"
    });
  });
});
