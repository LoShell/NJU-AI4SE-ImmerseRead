import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeAtmosphere, sendCompanionChat } from "./client";

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

describe("analyzeAtmosphere", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the current segment text to the atmosphere endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          segmentId: "segment-1",
          moods: ["悬疑"],
          scenes: ["雨夜"],
          pace: "slow",
          intensity: 0.7,
          energy: 0.4,
          darkness: 0.8,
          warmth: 0.2,
          tags: ["雨", "门"],
          chapterEndPrompt: "这里像是暴风雨前的停顿。",
          modelName: "test-model"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const profile = await analyzeAtmosphere("segment-1", "雨落在门外。");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/llm/atmosphere",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentId: "segment-1", text: "雨落在门外。" })
      })
    );
    expect(profile).toEqual(
      expect.objectContaining({
        segmentId: "segment-1",
        moods: ["悬疑"],
        scenes: ["雨夜"],
        modelName: "test-model"
      })
    );
    expect(profile.createdAt).toEqual(expect.any(String));
  });

  it("returns a neutral local profile when the backend is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("missing key", { status: 503 })));

    await expect(analyzeAtmosphere("segment-1", "text")).resolves.toEqual(
      expect.objectContaining({
        segmentId: "segment-1",
        moods: ["平静"],
        scenes: ["阅读"],
        pace: "medium",
        modelName: "disabled"
      })
    );
  });
});
