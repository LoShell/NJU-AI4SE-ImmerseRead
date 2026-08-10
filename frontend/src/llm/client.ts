import type { SpoilerRisk } from "../spoiler/spoilerGuard";

export interface CompanionChatRequest {
  bookId: string;
  segmentId: string;
  question: string;
  allowedContext: string;
  contextStartChar: number;
  contextEndChar: number;
  spoilerRisk: SpoilerRisk;
}

export interface CompanionChatResponse {
  content: string;
  modelName: string;
}

const DISABLED_RESPONSE: CompanionChatResponse = {
  content: "LLM is not available yet. You can keep reading locally.",
  modelName: "disabled"
};

export async function sendCompanionChat(request: CompanionChatRequest): Promise<CompanionChatResponse> {
  try {
    const response = await fetch("/api/llm/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      return DISABLED_RESPONSE;
    }

    return (await response.json()) as CompanionChatResponse;
  } catch {
    return DISABLED_RESPONSE;
  }
}
