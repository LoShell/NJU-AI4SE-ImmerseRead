package cn.immerseread.llm.dto;

public record ChatRequest(
    String bookId,
    String segmentId,
    String question,
    String allowedContext,
    int contextStartChar,
    int contextEndChar,
    String spoilerRisk
) {}
