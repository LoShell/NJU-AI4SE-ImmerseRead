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

export async function sendCompanionChat(request: CompanionChatRequest, signal?: AbortSignal): Promise<CompanionChatResponse> {
  try {
    const response = await fetch("/api/llm/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal
    });

    if (!response.ok) {
      throw new Error(`聊天请求失败（HTTP ${response.status}），请检查后端配置后重试。`);
    }

    return (await response.json()) as CompanionChatResponse;
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.message.startsWith("聊天请求失败"))) throw error;
    throw new Error("无法连接聊天服务，请确认后端已启动。");
  }
}

export async function analyzeAtmosphere(segmentId: string, text: string, signal?: AbortSignal): Promise<AtmosphereProfile> {
  try {
    const response = await fetch("/api/llm/atmosphere", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segmentId, text }),
      signal
    });

    if (!response.ok) {
      throw new Error(`氛围分析失败（HTTP ${response.status}），请稍后重试。`);
    }

    const profile = (await response.json()) as Omit<AtmosphereProfile, "createdAt"> & {
      createdAt?: string;
    };

    return {
      ...profile,
      segmentId,
      createdAt: profile.createdAt ?? new Date().toISOString()
    };
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.message.startsWith("氛围分析失败"))) throw error;
    throw new Error("无法连接氛围服务，请确认后端已启动。");
  }
}
