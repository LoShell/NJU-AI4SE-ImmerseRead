package cn.immerseread.llm.dto;

import java.util.List;

public record AtmosphereResponse(
    String segmentId,
    List<String> moods,
    List<String> scenes,
    String pace,
    int intensity,
    int energy,
    int darkness,
    int warmth,
    List<String> tags,
    String chapterEndPrompt,
    String modelName
) {}
