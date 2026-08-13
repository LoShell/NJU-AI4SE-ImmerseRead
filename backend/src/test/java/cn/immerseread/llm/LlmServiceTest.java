package cn.immerseread.llm;

import cn.immerseread.config.CredentialStatus;
import cn.immerseread.config.CredentialStore;
import cn.immerseread.config.LlmProperties;
import cn.immerseread.llm.dto.AtmosphereRequest;
import cn.immerseread.llm.dto.AtmosphereResponse;
import cn.immerseread.llm.dto.ChatRequest;
import cn.immerseread.llm.dto.ChatResponse;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LlmServiceTest {
    @Test
    void chatReturnsDisabledMessageWhenApiKeyIsMissing() {
        LlmService service = new LlmService(missingStore(), throwingClient(), new LlmProperties());
        ChatRequest request = new ChatRequest("book", "segment", "问题", "正文", 0, 2, "low");

        ChatResponse response = service.chat(request);

        assertThat(response.content()).isEqualTo("LLM 功能尚未配置，请先设置 API key。");
        assertThat(response.modelName()).isEqualTo("disabled");
    }

    @Test
    void atmosphereReturnsNeutralProfileWhenApiKeyIsMissing() {
        LlmService service = new LlmService(missingStore(), throwingClient(), new LlmProperties());
        AtmosphereRequest request = new AtmosphereRequest("segment", "正文");

        AtmosphereResponse response = service.analyzeAtmosphere(request);

        assertThat(response.segmentId()).isEqualTo("segment");
        assertThat(response.moods()).containsExactly("平静");
        assertThat(response.tags()).containsExactly("平静");
        assertThat(response.energy()).isEqualTo(0.3);
        assertThat(response.modelName()).isEqualTo("disabled");
    }

    @Test
    void atmosphereUsesStructuredProviderJsonWhenApiKeyIsConfigured() {
        LlmProperties properties = new LlmProperties();
        properties.setModelName("test-model");
        ChatClient client = (apiKey, prompt) -> """
            {
              "moods": ["紧张"],
              "scenes": ["雨夜"],
              "pace": "fast",
              "intensity": 0.8,
              "energy": 0.7,
              "darkness": 0.6,
              "warmth": 0.2,
              "tags": ["悬疑"],
              "chapterEndPrompt": "门外传来脚步声。"
            }
            """;
        LlmService service = new LlmService(configuredStore(), client, properties);

        AtmosphereResponse response = service.analyzeAtmosphere(new AtmosphereRequest("segment", "正文"));

        assertThat(response.segmentId()).isEqualTo("segment");
        assertThat(response.moods()).containsExactly("紧张");
        assertThat(response.scenes()).containsExactly("雨夜");
        assertThat(response.pace()).isEqualTo("fast");
        assertThat(response.intensity()).isEqualTo(0.8);
        assertThat(response.energy()).isEqualTo(0.7);
        assertThat(response.tags()).containsExactly("悬疑");
        assertThat(response.chapterEndPrompt()).isEqualTo("门外传来脚步声。");
        assertThat(response.modelName()).isEqualTo("test-model");
    }

    private static CredentialStore missingStore() {
        return new CredentialStore() {
            @Override
            public Optional<String> resolveApiKey() {
                return Optional.empty();
            }

            @Override
            public CredentialStatus status() {
                return new CredentialStatus(false, "test", "未配置");
            }

            @Override
            public void set(char[] key) {
                throw new UnsupportedOperationException("not used");
            }

            @Override
            public void clear() {
                throw new UnsupportedOperationException("not used");
            }
        };
    }

    private static CredentialStore configuredStore() {
        return new CredentialStore() {
            @Override
            public Optional<String> resolveApiKey() {
                return Optional.of("sk-test");
            }

            @Override
            public CredentialStatus status() {
                return new CredentialStatus(true, "test", "已配置");
            }

            @Override
            public void set(char[] key) {
                throw new UnsupportedOperationException("not used");
            }

            @Override
            public void clear() {
                throw new UnsupportedOperationException("not used");
            }
        };
    }

    private static ChatClient throwingClient() {
        return (apiKey, prompt) -> {
            throw new AssertionError("provider must not be called without an API key");
        };
    }
}
