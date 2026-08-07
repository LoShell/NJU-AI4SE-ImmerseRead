package cn.immerseread.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "immerseread.llm")
public class LlmProperties {
    private String modelName = "gpt-4.1-mini";
    private String apiUrl = "https://api.openai.com/v1/responses";
    private String apiKey = "";

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        if (modelName != null && !modelName.isBlank()) {
            this.modelName = modelName;
        }
    }

    public String getApiUrl() {
        return apiUrl;
    }

    public void setApiUrl(String apiUrl) {
        if (apiUrl != null && !apiUrl.isBlank()) {
            this.apiUrl = apiUrl;
        }
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey == null ? "" : apiKey;
    }
}
