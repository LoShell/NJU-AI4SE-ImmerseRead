package cn.immerseread.llm;

import cn.immerseread.config.LlmProperties;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class OpenAiChatClient implements ChatClient {
    private final RestClient restClient;
    private final LlmProperties properties;

    public OpenAiChatClient(LlmProperties properties) {
        this.restClient = RestClient.create();
        this.properties = properties;
    }

    @Override
    public String complete(String apiKey, String prompt) {
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
}
