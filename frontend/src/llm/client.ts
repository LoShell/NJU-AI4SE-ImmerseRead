import type { SpoilerRisk } from "../spoiler/spoilerGuard";
import type { AtmosphereProfile } from "../bgm/bgmTypes";

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

export async function analyzeAtmosphere(segmentId: string, text: string): Promise<AtmosphereProfile> {
  try {
    const response = await fetch("/api/llm/atmosphere", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segmentId, text })
    });

    if (!response.ok) {
      return createNeutralAtmosphereProfile(segmentId);
    }

    const profile = (await response.json()) as Omit<AtmosphereProfile, "createdAt"> & {
      createdAt?: string;
    };

    return {
      ...profile,
      segmentId,
      createdAt: profile.createdAt ?? new Date().toISOString()
    };
  } catch {
    return createNeutralAtmosphereProfile(segmentId);
  }
}

function createNeutralAtmosphereProfile(segmentId: string): AtmosphereProfile {
  return {
    segmentId,
    moods: ["平静"],
    scenes: ["阅读"],
    pace: "medium",
    intensity: 0.3,
    energy: 0.3,
    darkness: 0.2,
    warmth: 0.4,
    tags: ["平静"],
    chapterEndPrompt: "先保持当前阅读节奏。",
    modelName: "disabled",
    createdAt: new Date().toISOString()
  };
}
