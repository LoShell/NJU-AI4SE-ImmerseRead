package cn.immerseread.llm;

import cn.immerseread.config.LlmProperties;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class OpenAiChatClient implements ChatClient {
    private final RestClient restClient;
    private final LlmProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OpenAiChatClient(LlmProperties properties) {
        this.restClient = RestClient.create();
        this.properties = properties;
    }

    @Override
    public String complete(String apiKey, String prompt) {
        if ("deepseek".equals(properties.getProvider())) {
            return completeChatCompletions(apiKey, prompt);
        }
        return completeResponses(apiKey, prompt);
    }

    private String completeResponses(String apiKey, String prompt) {
        Map<String, Object> body = Map.of(
            "model", properties.getModelName(),
            "input", List.of(Map.of("role", "user", "content", prompt))
        );

        Map response = restClient.post()
            .uri(properties.getApiUrl())
            .header("Authorization", "Bearer " + apiKey)
            .body(body)
            .retrieve()
            .body(Map.class);

        Object outputText = response == null ? null : response.get("output_text");
        return outputText == null ? "" : outputText.toString();
    }

    private String completeChatCompletions(String apiKey, String prompt) {
        Map<String, Object> body = Map.of(
            "model", properties.getModelName(),
            "messages", List.of(Map.of("role", "user", "content", prompt)),
            "stream", false
        );

        String response = restClient.post()
            .uri(chatCompletionsUrl(properties.getApiUrl()))
            .header("Authorization", "Bearer " + apiKey)
            .body(body)
            .retrieve()
            .body(String.class);

        return parseChoiceMessageContent(response);
    }

    private String parseChoiceMessageContent(String response) {
        if (response == null || response.isBlank()) {
            return "";
        }
        JsonNode root = objectMapper.readTree(response);
        JsonNode choices = root.path("choices");
        if (!choices.isArray() || choices.isEmpty()) {
            return "";
        }
        return choices.get(0).path("message").path("content").asText("");
    }

    private static String chatCompletionsUrl(String baseUrl) {
        String normalized = trimTrailingSlashes(baseUrl);
        if (normalized.endsWith("/chat/completions")) {
            return normalized;
        }
        if (normalized.endsWith("/v1")) {
            return normalized + "/chat/completions";
        }
        return normalized + "/chat/completions";
    }

    private static String trimTrailingSlashes(String value) {
        String normalized = value;
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
