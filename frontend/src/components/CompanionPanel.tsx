import { useState, type FormEvent } from "react";
import type { ChatMessage, ReadingProgress, Segment } from "../domain/models";
import { sendCompanionChat } from "../llm/client";
import { buildAllowedContext } from "../spoiler/spoilerGuard";

export interface CompanionPanelProps {
  activeSegment?: Segment;
  annotationNote?: string;
  bookId?: string;
  messages: ChatMessage[];
  onPersistMessage: (message: ChatMessage) => Promise<void>;
  progress?: ReadingProgress;
  segments: Segment[];
  selectedText?: string;
}

export function CompanionPanel({
  activeSegment,
  annotationNote,
  bookId,
  messages,
  onPersistMessage,
  progress,
  segments,
  selectedText
}: CompanionPanelProps) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState(messages);
  const [isSending, setIsSending] = useState(false);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();

    if (!question || !bookId || !activeSegment || !progress) {
      return;
    }

    setIsSending(true);
    const allowedContext = buildAllowedContext({
      segments,
      progress,
      question,
      selectedText,
      annotationNote
    });
    const userMessage = createChatMessage({
      bookId,
      segmentId: activeSegment.id,
      role: "user",
      content: question,
      selectedText,
      contextStartChar: allowedContext.contextStartChar,
      contextEndChar: allowedContext.contextEndChar
    });

    setLocalMessages((current) => [...current, userMessage]);
    await onPersistMessage(userMessage);
    setDraft("");

    const response = await sendCompanionChat({
      bookId,
      segmentId: activeSegment.id,
      question,
      allowedContext: allowedContext.text,
      contextStartChar: allowedContext.contextStartChar,
      contextEndChar: allowedContext.contextEndChar,
      spoilerRisk: allowedContext.spoilerRisk
    });

    const assistantMessage = createChatMessage({
      bookId,
      segmentId: activeSegment.id,
      role: "assistant",
      content: response.content,
      contextStartChar: allowedContext.contextStartChar,
      contextEndChar: allowedContext.contextEndChar
    });
    setLocalMessages((current) => [...current, assistantMessage]);
    await onPersistMessage(assistantMessage);
    setIsSending(false);
  }

  return (
    <section className="assistant-card companion-chat" aria-label="书搭子聊天">
      <p className="eyebrow">anti-spoiler companion</p>
      <h2>书搭子</h2>
      <div className="chat-message-list" aria-label="本地聊天记录">
        {localMessages.length > 0 ? (
          localMessages.map((message) => (
            <p className={`chat-message chat-message-${message.role}`} key={message.id}>
              {message.content}
            </p>
          ))
        ) : (
          <p>还没有聊天记录。</p>
        )}
      </div>
      {selectedText && <p className="selection-context">正在带着批注片段提问：{selectedText}</p>}
      <form className="chat-form" onSubmit={(event) => void submitMessage(event)}>
        <textarea
          disabled={!bookId || !activeSegment || isSending}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="和书搭子聊聊当前剧情"
          value={draft}
        />
        <button disabled={!draft.trim() || isSending || !bookId || !activeSegment} type="submit">
          发送
        </button>
      </form>
    </section>
  );
}

function createChatMessage(input: {
  bookId: string;
  segmentId: string;
  role: ChatMessage["role"];
  content: string;
  selectedText?: string;
  contextStartChar: number;
  contextEndChar: number;
}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    segmentId: input.segmentId,
    role: input.role,
    content: input.content,
    selectedText: input.selectedText,
    contextStartChar: input.contextStartChar,
    contextEndChar: input.contextEndChar,
    spoilerPolicy: "strict",
    createdAt: new Date().toISOString()
  };
}
