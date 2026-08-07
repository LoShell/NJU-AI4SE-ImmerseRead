package cn.immerseread.llm.dto;

import java.util.List;

public record AtmosphereResponse(
    String segmentId,
    List<String> moods,
    List<String> scenes,
    String pace,
    double intensity,
    double energy,
    double darkness,
    double warmth,
    List<String> tags,
    String chapterEndPrompt,
    String modelName
) {}
