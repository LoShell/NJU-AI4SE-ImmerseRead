package cn.immerseread.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "immerseread.llm")
public class LlmProperties {
    private String provider = "openai";
    private String modelName = "gpt-4.1-mini";
    private String apiUrl = "https://api.openai.com/v1/responses";
    private String apiKey = "";

    public String getProvider() {
        return firstNonBlank(System.getenv("LLM_PROVIDER"), provider).toLowerCase();
    }

    public void setProvider(String provider) {
        if (provider != null && !provider.isBlank()) {
            this.provider = provider;
        }
    }

    public String getModelName() {
        return firstNonBlank(System.getenv("LLM_MODEL"), System.getenv("OPENAI_MODEL"), modelName);
    }

    public void setModelName(String modelName) {
        if (modelName != null && !modelName.isBlank()) {
            this.modelName = modelName;
        }
    }

    public String getApiUrl() {
        return firstNonBlank(System.getenv("LLM_BASE_URL"), System.getenv("OPENAI_BASE_URL"), apiUrl);
    }

    public void setApiUrl(String apiUrl) {
        if (apiUrl != null && !apiUrl.isBlank()) {
            this.apiUrl = apiUrl;
        }
    }

    public String getApiKey() {
        return firstNonBlank(
            System.getenv("LLM_API_KEY"),
            System.getenv("DEEPSEEK_API_KEY"),
            System.getenv("OPENAI_API_KEY"),
            apiKey
        );
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey == null ? "" : apiKey;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }
}
