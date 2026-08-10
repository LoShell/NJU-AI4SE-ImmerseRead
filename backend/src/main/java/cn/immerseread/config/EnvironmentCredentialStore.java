package cn.immerseread.config;

import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class EnvironmentCredentialStore implements CredentialStore {
    private final String apiKey;

    @Autowired
    public EnvironmentCredentialStore(LlmProperties properties) {
        this(firstNonBlank(
            properties.getApiKey(),
            System.getenv("LLM_API_KEY"),
            System.getenv("DEEPSEEK_API_KEY"),
            System.getenv("OPENAI_API_KEY")
        ));
    }

    public EnvironmentCredentialStore(String apiKey) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    @Override
    public Optional<String> resolveApiKey() {
        return apiKey.isBlank() ? Optional.empty() : Optional.of(apiKey);
    }

    @Override
    public CredentialStatus status() {
        if (apiKey.isBlank()) {
            return new CredentialStatus(false, "environment", "未配置");
        }
        return new CredentialStatus(true, "environment", "已配置");
    }

    @Override
    public void set(char[] key) {
        throw new UnsupportedOperationException("EnvironmentCredentialStore is read-only; set an environment variable or application property.");
    }

    @Override
    public void clear() {
        throw new UnsupportedOperationException("EnvironmentCredentialStore is read-only; clear the environment variable or application property.");
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
