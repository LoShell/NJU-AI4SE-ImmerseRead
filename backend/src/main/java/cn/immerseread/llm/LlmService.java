package cn.immerseread.llm;

import cn.immerseread.config.CredentialStore;
import cn.immerseread.config.LlmProperties;
import cn.immerseread.llm.dto.AtmosphereRequest;
import cn.immerseread.llm.dto.AtmosphereResponse;
import cn.immerseread.llm.dto.ChatRequest;
import cn.immerseread.llm.dto.ChatResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class LlmService {
    static final String DISABLED_MESSAGE = "LLM 功能尚未配置，请先设置 API key。";

    private final CredentialStore credentialStore;
    private final ChatClient chatClient;
    private final LlmProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LlmService(CredentialStore credentialStore, ChatClient chatClient, LlmProperties properties) {
        this.credentialStore = credentialStore;
        this.chatClient = chatClient;
        this.properties = properties;
    }

    public ChatResponse chat(ChatRequest request) {
        return credentialStore.resolveApiKey()
            .map(apiKey -> new ChatResponse(chatClient.complete(apiKey, chatPrompt(request)), properties.getModelName()))
            .orElseGet(() -> new ChatResponse(DISABLED_MESSAGE, "disabled"));
    }

    public AtmosphereResponse analyzeAtmosphere(AtmosphereRequest request) {
        return credentialStore.resolveApiKey()
            .map(apiKey -> {
                String json = chatClient.complete(apiKey, atmospherePrompt(request));
                return parseAtmosphere(request.segmentId(), json, properties.getModelName());
            })
            .orElseGet(() -> neutralAtmosphere(request.segmentId(), "disabled"));
    }

    private static AtmosphereResponse neutralAtmosphere(String segmentId, String modelName) {
        return new AtmosphereResponse(
            segmentId,
            List.of("平静"),
            List.of(),
            "medium",
            0.3,
            0.3,
            0.2,
            0.4,
            List.of("平静"),
            "",
            modelName
        );
    }

    private AtmosphereResponse parseAtmosphere(String segmentId, String json, String modelName) {
        try {
            JsonNode root = objectMapper.readTree(json);
            return new AtmosphereResponse(
                segmentId,
                stringList(root.path("moods")),
                stringList(root.path("scenes")),
                root.path("pace").asText("medium"),
                root.path("intensity").asDouble(0.3),
                root.path("energy").asDouble(0.3),
                root.path("darkness").asDouble(0.2),
                root.path("warmth").asDouble(0.4),
                stringList(root.path("tags")),
                root.path("chapterEndPrompt").asText(""),
                modelName
            );
        } catch (RuntimeException ex) {
            return neutralAtmosphere(segmentId, modelName);
        }
    }

    private static List<String> stringList(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<String> values = new java.util.ArrayList<>();
        for (JsonNode item : node) {
            String value = item.asText("");
            if (!value.isBlank()) {
                values.add(value);
            }
        }
        return values;
    }

    private static String chatPrompt(ChatRequest request) {
        return """
            你是陪读网文的朋友。请用简短、自然、轻松的语气回答用户问题。
            必须严格基于允许上下文回答，保持防剧透，不要泄露、暗示、确认或引用上下文之外的后续情节。
            剧透风险：%s
            允许上下文：
            %s
            用户问题：%s
            """.formatted(request.spoilerRisk(), request.allowedContext(), request.question());
    }

    private static String atmospherePrompt(AtmosphereRequest request) {
        return """
            只输出结构化 JSON，不要输出解释性文字。
            请分析文本氛围，字段包含 moods, scenes, pace, intensity, energy, darkness, warmth, tags, chapterEndPrompt。
            数值字段使用 0 到 1 的小数；pace 只能是 slow, medium, fast。
            文本：
            %s
            """.formatted(request.text());
    }
}
