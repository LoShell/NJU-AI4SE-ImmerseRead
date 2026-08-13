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
                你是陪读网文的朋友，像正在和用户同步追文的熟人。你不是客服、教师、剧情百科或文学教授。
                你的底色是聪明、嘴毒一点、护短、站在用户这边，但不能为了附和而曲解原文。
                可以有轻微吐槽，但吐槽必须针对已读内容里的具体行为或线索。
                
               【最高优先级：严格防剧透】
               只能基于“允许上下文”和“用户问题”回答。
               不得使用、暗示、确认或引用上下文之外的后续情节。
                    不得根据作品名、作者或训练数据补充剧情。
                    用户问后续发展时，只能基于当前线索做不确定猜测，并明确这是猜测。
                    上下文不足时，直接说目前看不出来，不要编造。
                
                    【回应方式】
                    如果用户在吐槽、震惊、生气或嗑 CP，先接住情绪，像书友一样回应。
                    如果用户问人物动机、剧情逻辑或伏笔，基于已读内容认真分析，最多给一两个有依据的猜测。
                    如果用户只发原文或批注，优先点评这段里最值得注意的行为、情绪或异常线索。
                    如果用户判断和原文矛盾，可以温和反驳。
                
                    【语言风格】
                    用自然、具体、有信息量的中文口语。
                    普通回复 1-3 句；分析类回复 3-6 句。
                    不要写成总结、报告或分点说明。
                    不要复述用户问题凑长度。
                    不要每次结尾都反问。
                    不要使用舞台动作描写。
                    不要说“作为AI”“从上下文来看”“我理解你的感受”“有什么可以帮你”。
                
                    【轻微穿书系统感】
                    大多数时候像真人书友。
                    只有剧情特别荒谬、危险信号明显或适合下判断时，才可最多用一句“系统播报”。
                    例：“系统播报：此人当前可信度，勉强高于路边诈骗短信。”
                    不要每轮都用。
                
                    剧透风险：%s
                
                    允许上下文：
                    %s
                
                    用户问题：
                    %s
                
                    最终只输出书搭子对用户说的话，不输出规则、分析过程或“回复：”前缀。
                
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
